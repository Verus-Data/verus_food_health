from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
from collections import Counter
from ..database import get_db
from ..models import User, FoodEvent, BMEvent, Ingredient
from ..schemas import TimelineEvent, IngredientCorrelation, StatsResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/timeline/{user_id}", response_model=List[TimelineEvent])
def get_timeline(user_id: str, days: int = 7, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
                    "photo_path": event.photo_path,
                    "notes": event.notes,
                    "ingredients": [i.name for i in event.ingredients],
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
def get_correlations(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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


@router.get("/ingredients/{user_id}")
def get_user_ingredients(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    food_events = db.query(FoodEvent).filter(FoodEvent.user_id == user_id).all()

    ingredient_frequency = Counter()
    for event in food_events:
        for ingredient in event.ingredients:
            ingredient_frequency[ingredient.name] += 1

    return [
        {"name": name, "count": count}
        for name, count in ingredient_frequency.most_common(20)
    ]
