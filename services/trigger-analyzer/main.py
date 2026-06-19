from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from scipy import stats
from collections import defaultdict
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Trigger Analyzer Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FoodEntryInput(BaseModel):
    id: str
    timestamp: datetime
    ingredients: List[str]


class HealthOutcomeInput(BaseModel):
    id: str
    timestamp: datetime
    type: str
    severity: int


class AnalyzeRequest(BaseModel):
    userId: str
    foodEntries: List[FoodEntryInput]
    healthOutcomes: List[HealthOutcomeInput]
    timeWindowHours: int = 24


class TriggerResult(BaseModel):
    ingredient: str
    pValue: float
    effectSize: float
    sampleSize: int
    confidence: str
    avgSeverityWith: float
    avgSeverityWithout: float
    countWith: int
    countWithout: int


class AnalyzeResponse(BaseModel):
    userId: str
    triggers: List[TriggerResult]
    analyzedAt: str


class PredictionRequest(BaseModel):
    userId: str
    ingredients: List[str]


class PredictionWarning(BaseModel):
    ingredient: str
    message: str
    pValue: float
    confidence: str


class PredictionResponse(BaseModel):
    userId: str
    warnings: List[PredictionWarning]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "trigger-analyzer", "version": "1.0.0"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_triggers(request: AnalyzeRequest):
    if len(request.foodEntries) < 3 or len(request.healthOutcomes) < 3:
        raise HTTPException(
            status_code=400,
            detail="Need at least 3 food entries and 3 health outcomes for analysis",
        )

    ingredient_outcomes = defaultdict(list)
    ingredient_counts = defaultdict(lambda: {"with": 0, "without": 0})
    ingredient_severities = defaultdict(lambda: {"with": [], "without": []})

    for outcome in request.healthOutcomes:
        outcome_window_start = outcome.timestamp - timedelta(
            hours=request.timeWindowHours
        )
        outcome_window_end = outcome.timestamp + timedelta(
            hours=request.timeWindowHours
        )

        relevant_entries = [
            fe
            for fe in request.foodEntries
            if outcome_window_start <= fe.timestamp <= outcome_window_end
        ]

        ingredients_in_window = set()
        for entry in relevant_entries:
            for ing in entry.ingredients:
                ingredients_in_window.add(ing.lower())

        for ing in ingredients_in_window:
            ingredient_outcomes[ing.lower()].append(outcome.severity)

    all_ingredients = set()
    for entry in request.foodEntries:
        for ing in entry.ingredients:
            all_ingredients.add(ing.lower())

    total_outcomes = len(request.healthOutcomes)

    triggers = []
    for ingredient in all_ingredients:
        severities_with = ingredient_outcomes.get(ingredient, [])
        count_with = len(severities_with)

        if count_with < 1:
            continue

        ingredient_counts[ingredient]["with"] = count_with
        ingredient_severities[ingredient]["with"] = severities_with

        other_outcomes = [
            o.severity
            for o in request.healthOutcomes
            if o.severity not in severities_with
        ]
        count_without = len(other_outcomes)

        if count_without < 1:
            continue

        ingredient_counts[ingredient]["without"] = count_without
        ingredient_severities[ingredient]["without"] = other_outcomes

        avg_with = np.mean(severities_with) if severities_with else 0
        avg_without = np.mean(other_outcomes) if other_outcomes else 0

        effect_size = avg_with - avg_without

        all_severities = severities_with + other_outcomes
        if len(all_severities) > 1 and np.std(all_severities) > 0:
            pooled_std = np.std(all_severities)
            z_score = effect_size / pooled_std if pooled_std > 0 else 0
            p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
        else:
            p_value = 1.0

        sample_size = count_with + count_without

        if p_value < 0.01:
            confidence = "high"
        elif p_value < 0.05:
            confidence = "moderate"
        elif p_value < 0.1:
            confidence = "low"
        else:
            confidence = "none"

        triggers.append(
            TriggerResult(
                ingredient=ingredient,
                pValue=round(p_value, 4),
                effectSize=round(effect_size, 3),
                sampleSize=sample_size,
                confidence=confidence,
                avgSeverityWith=round(avg_with, 2),
                avgSeverityWithout=round(avg_without, 2),
                countWith=count_with,
                countWithout=count_without,
            )
        )

    triggers.sort(key=lambda x: x.pValue)

    return AnalyzeResponse(
        userId=request.userId,
        triggers=triggers,
        analyzedAt=datetime.utcnow().isoformat(),
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_warnings(request: PredictionRequest):
    raise HTTPException(
        status_code=501,
        detail="Prediction requires stored trigger data. Use /analyze first.",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
