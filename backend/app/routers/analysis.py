from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from collections import Counter
import io
import csv as csv_module
import json
import os
import requests

from ..database import get_db
from ..models import User, FoodEvent, BMEvent, Ingredient, HealthOutcome, PersonalTrigger, DailyTrend
from ..schemas import (
    TimelineEvent, IngredientCorrelation, StatsResponse,
    PredictionsResponse, PredictionWarning, AnalysisRunResponse, TriggerData,
)
from .auth import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/timeline/{user_id}", response_model=List[TimelineEvent])
def get_timeline(
    user_id: str,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get timeline events for the current user."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    start_date = datetime.utcnow() - timedelta(days=days)

    food_events = (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == user_id, FoodEvent.timestamp >= start_date)
        .all()
    )

    bm_events = (
        db.query(BMEvent)
        .filter(BMEvent.user_id == user_id, BMEvent.timestamp >= start_date)
        .all()
    )

    timeline = []

    for event in food_events:
        timeline.append(
            TimelineEvent(
                id=event.id,
                type="food",
                timestamp=event.timestamp,
                data={
                    "photo_url": event.photo_url,
                    "notes": event.notes,
                    "ingredients": [i.name for i in event.ingredients],
                    "description": event.description,
                    "estimated_calories": event.estimated_calories,
                },
            )
        )

    for event in bm_events:
        timeline.append(
            TimelineEvent(
                id=event.id,
                type="bm",
                timestamp=event.timestamp,
                data={
                    "bristol_scale": event.bristol_scale,
                    "color": event.color,
                    "notes": event.notes,
                },
            )
        )

    timeline.sort(key=lambda x: x.timestamp, reverse=True)
    return timeline


@router.get("/correlations/{user_id}", response_model=StatsResponse)
def get_correlations(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ingredient correlations for the current user."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    food_events = db.query(FoodEvent).filter(FoodEvent.user_id == user_id).all()
    bm_events = db.query(BMEvent).filter(BMEvent.user_id == user_id).all()

    ingredient_bristol_map = {}

    for food in food_events:
        bm_within_24h = [
            bm
            for bm in bm_events
            if bm.timestamp > food.timestamp
            and bm.timestamp <= food.timestamp + timedelta(hours=24)
        ]

        if bm_within_24h:
            for ingredient in food.ingredients:
                if ingredient.name not in ingredient_bristol_map:
                    ingredient_bristol_map[ingredient.name] = []
                ingredient_bristol_map[ingredient.name].extend(
                    [bm.bristol_scale for bm in bm_within_24h]
                )

    correlations = []
    for ingredient, bristol_scores in ingredient_bristol_map.items():
        avg_bristol = sum(bristol_scores) / len(bristol_scores)
        distribution = dict(Counter(bristol_scores))
        correlations.append(
            IngredientCorrelation(
                ingredient=ingredient,
                avg_bristol=round(avg_bristol, 2),
                event_count=len(bristol_scores),
                bristol_distribution=distribution,
            )
        )

    correlations.sort(key=lambda x: x.event_count, reverse=True)

    return StatsResponse(
        total_food_events=len(food_events),
        total_bm_events=len(bm_events),
        ingredient_correlations=correlations,
    )


@router.get("/correlations")
def get_correlations_no_id(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get correlations for the current user (no user_id in URL)."""
    return get_correlations(current_user.id, current_user, db)


@router.get("/ingredients/{user_id}")
def get_user_ingredients(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ingredient frequency for the current user."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    food_events = db.query(FoodEvent).filter(FoodEvent.user_id == user_id).all()

    ingredient_frequency = Counter()
    for event in food_events:
        for ingredient in event.ingredients:
            ingredient_frequency[ingredient.name] += 1

    return [
        {"name": name, "count": count}
        for name, count in ingredient_frequency.most_common(20)
    ]


@router.get("/trends")
def get_trends(
    userId: str = None,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get trends data for the current user."""
    user_id = userId or current_user.id
    if user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid userId")

    start_date = datetime.utcnow() - timedelta(days=days)

    trends = (
        db.query(DailyTrend)
        .filter(DailyTrend.user_id == user_id, DailyTrend.date >= start_date)
        .order_by(DailyTrend.date.asc())
        .all()
    )

    food_entries = (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == user_id, FoodEvent.timestamp >= start_date)
        .all()
    )

    health_outcomes = (
        db.query(HealthOutcome)
        .filter(HealthOutcome.user_id == user_id, HealthOutcome.timestamp >= start_date)
        .all()
    )

    # Weekly aggregation
    weekly_data = {}
    for t in trends:
        week_start = get_week_start(t.date)
        key = week_start.isoformat().split("T")[0]
        if key not in weekly_data:
            weekly_data[key] = {"severity": [], "count": 0}
        if t.avg_bm_severity:
            weekly_data[key]["severity"].append(t.avg_bm_severity)
        weekly_data[key]["count"] += 1

    weekly_trends = []
    for week, data in weekly_data.items():
        avg_sev = None
        if data["severity"]:
            avg_sev = round(sum(data["severity"]) / len(data["severity"]), 2)
        weekly_trends.append({
            "week": week,
            "avgSeverity": avg_sev,
            "dayCount": data["count"],
        })

    # Top ingredients
    ingredient_consumption = Counter()
    for entry in food_entries:
        for ing in entry.ingredients:
            ingredient_consumption[ing.name.lower()] += 1

    top_ingredients = [
        {"name": name, "count": count}
        for name, count in ingredient_consumption.most_common(10)
    ]

    # Most common outcomes
    outcome_types = Counter()
    for o in health_outcomes:
        outcome_types[o.type] += 1

    most_common_outcomes = [
        {"type": t, "count": c}
        for t, c in outcome_types.most_common(5)
    ]

    avg_daily_bm = None
    if trends:
        avg_daily_bm = round(
            sum(t.avg_bm_severity or 0 for t in trends) / len(trends), 2
        )

    return {
        "userId": user_id,
        "period": {"days": days, "startDate": start_date.isoformat()},
        "dailyTrends": [
            {
                "id": t.id,
                "date": t.date.isoformat(),
                "avgBmSeverity": t.avg_bm_severity,
                "avgEnergy": t.avg_energy,
                "foodCount": t.food_count,
                "outcomeCount": t.outcome_count,
            }
            for t in trends
        ],
        "weeklyTrends": weekly_trends,
        "topIngredients": top_ingredients,
        "mostCommonOutcomes": most_common_outcomes,
        "summary": {
            "totalFoodEntries": len(food_entries),
            "totalHealthOutcomes": len(health_outcomes),
            "avgDailyBmSeverity": avg_daily_bm,
        },
    }


@router.get("/predictions")
def get_predictions(
    userId: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get personalized trigger predictions for the current user."""
    user_id = userId or current_user.id
    if user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid userId")

    triggers = (
        db.query(PersonalTrigger)
        .filter(PersonalTrigger.user_id == user_id)
        .order_by(PersonalTrigger.p_value.asc())
        .all()
    )

    warnings = []
    for t in triggers:
        if t.confidence not in ("none", "low"):
            warnings.append(
                PredictionWarning(
                    ingredient=t.ingredient,
                    message=f"{t.ingredient} is associated with your BM severity (p={t.p_value:.2f})",
                    p_value=t.p_value,
                    confidence=t.confidence,
                    effect_size=t.effect_size,
                )
            )

    return PredictionsResponse(user_id=user_id, warnings=warnings)


@router.get("/export")
def export_data(
    userId: str = None,
    format: str = "json",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export user data as JSON or CSV."""
    user_id = userId or current_user.id
    if user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid userId")

    food_entries = (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == user_id)
        .order_by(FoodEvent.timestamp.desc())
        .all()
    )

    health_outcomes = (
        db.query(HealthOutcome)
        .filter(HealthOutcome.user_id == user_id)
        .order_by(HealthOutcome.timestamp.desc())
        .all()
    )

    triggers = (
        db.query(PersonalTrigger)
        .filter(PersonalTrigger.user_id == user_id)
        .order_by(PersonalTrigger.p_value.asc())
        .all()
    )

    user = db.query(User).filter(User.id == user_id).first()

    if format == "csv":
        output = io.StringIO()
        writer = csv_module.writer(output)

        writer.writerow(["Section: User Info"])
        writer.writerow(["email", "name", "createdAt"])
        writer.writerow([user.email if user else "", user.name if user else "", user.created_at.isoformat() if user else ""])
        writer.writerow([])

        writer.writerow(["Section: Food Entries"])
        writer.writerow(["entry_id", "timestamp", "description", "calories", "ingredient_name", "ingredient_source"])
        for entry in food_entries:
            ingredients_str = "; ".join(f"{i.name}|{i.source}" for i in entry.ingredients)
            writer.writerow([
                entry.id,
                entry.timestamp.isoformat(),
                entry.description or "",
                entry.estimated_calories or "",
                ingredients_str,
            ])
        writer.writerow([])

        writer.writerow(["Section: Health Outcomes"])
        writer.writerow(["outcome_id", "timestamp", "type", "severity", "bristol_scale", "color", "notes"])
        for outcome in health_outcomes:
            writer.writerow([
                outcome.id,
                outcome.timestamp.isoformat(),
                outcome.type,
                outcome.severity,
                outcome.bristol_scale or "",
                outcome.color or "",
                (outcome.notes or "").replace(",", ";"),
            ])
        writer.writerow([])

        writer.writerow(["Section: Personalized Triggers"])
        writer.writerow(["ingredient", "p_value", "effect_size", "sample_size", "confidence", "avg_severity_with", "avg_severity_without"])
        for t in triggers:
            writer.writerow([
                t.ingredient,
                t.p_value,
                t.effect_size,
                t.sample_size,
                t.confidence,
                t.avg_severity_with,
                t.avg_severity_without,
            ])

        from fastapi.responses import Response
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="gut-health-export-{user_id}.csv"',
            },
        )

    return {
        "exportDate": datetime.utcnow().isoformat(),
        "user": {
            "id": user.id if user else None,
            "email": user.email if user else None,
            "name": user.name if user else None,
            "createdAt": user.created_at.isoformat() if user else None,
        },
        "foodEntries": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "description": e.description,
                "estimatedCalories": e.estimated_calories,
                "ingredients": [{"name": i.name, "source": i.source} for i in e.ingredients],
            }
            for e in food_entries
        ],
        "healthOutcomes": [
            {
                "id": o.id,
                "timestamp": o.timestamp.isoformat(),
                "type": o.type,
                "severity": o.severity,
            }
            for o in health_outcomes
        ],
        "personalTriggers": [
            {
                "ingredient": t.ingredient,
                "pValue": t.p_value,
                "effectSize": t.effect_size,
                "confidence": t.confidence,
            }
            for t in triggers
        ],
    }


@router.post("/run")
def run_analysis(
    userId: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run trigger analysis for the current user."""
    import os as os_mod

    user_id = userId or current_user.id
    if user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid userId")

    food_entries = (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == user_id)
        .order_by(FoodEvent.timestamp.asc())
        .all()
    )

    health_outcomes = (
        db.query(HealthOutcome)
        .filter(HealthOutcome.user_id == user_id)
        .order_by(HealthOutcome.timestamp.asc())
        .all()
    )

    if len(food_entries) < 3 or len(health_outcomes) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 3 food entries and 3 health outcomes (have {len(food_entries)} food, {len(health_outcomes)} outcomes)",
        )

    analyzer_url = os_mod.environ.get("TRIGGER_ANALYZER_URL", "http://localhost:8002")

    analyze_request = {
        "userId": user_id,
        "foodEntries": [
            {
                "id": fe.id,
                "timestamp": fe.timestamp.isoformat(),
                "ingredients": [i.name for i in fe.ingredients],
            }
            for fe in food_entries
        ],
        "healthOutcomes": [
            {
                "id": ho.id,
                "timestamp": ho.timestamp.isoformat(),
                "type": ho.type,
                "severity": ho.severity,
            }
            for ho in health_outcomes
        ],
        "timeWindowHours": 24,
    }

    try:
        response = requests.post(
            f"{analyzer_url}/analyze",
            json=analyze_request,
            timeout=30,
        )
        if not response.ok:
            raise HTTPException(
                status_code=503,
                detail=f"Trigger analyzer returned {response.status_code}",
            )
        analysis_result = response.json()
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Trigger analyzer service unavailable: {str(e)}",
        )

    # Delete old triggers and create new ones
    db.query(PersonalTrigger).filter(PersonalTrigger.user_id == user_id).delete()

    trigger_records = []
    for t in analysis_result.get("triggers", []):
        trigger = PersonalTrigger(
            user_id=user_id,
            ingredient=t["ingredient"],
            p_value=t["pValue"],
            effect_size=t["effectSize"],
            sample_size=t["sampleSize"],
            confidence=t["confidence"],
            avg_severity_with=t["avgSeverityWith"],
            avg_severity_without=t["avgSeverityWithout"],
            count_with=t.get("countWith", 0),
            count_without=t.get("countWithout", 0),
            last_analyzed=datetime.utcnow(),
        )
        db.add(trigger)
        trigger_records.append(trigger)

    db.commit()

    significant = [t for t in trigger_records if t.confidence in ("high", "moderate")]

    return AnalysisRunResponse(
        user_id=user_id,
        triggers_analyzed=len(trigger_records),
        significant_triggers=len(significant),
        triggers=[
            TriggerData(
                ingredient=t.ingredient,
                p_value=t.p_value,
                effect_size=t.effect_size,
                sample_size=t.sample_size,
                confidence=t.confidence,
                avg_severity_with=t.avg_severity_with,
                avg_severity_without=t.avg_severity_without,
                count_with=t.count_with or 0,
                count_without=t.count_without or 0,
            )
            for t in trigger_records
        ],
        analyzed_at=analysis_result.get("analyzedAt"),
    )


def get_week_start(date):
    d = datetime(date.year, date.month, date.day)
    day_of_week = d.weekday()
    d -= timedelta(days=day_of_week)
    return d