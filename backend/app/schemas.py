from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import List, Optional
from uuid import UUID


# ---- Auth ----

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    name: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: "UserAuthResponse"


class UserAuthResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


# ---- Users ----

class UserCreate(BaseModel):
    pass


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Ingredients ----

class IngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    source: str = "manual"


class IngredientResponse(BaseModel):
    id: str
    name: str
    source: str = "manual"
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Food Events ----

class FoodEventCreate(BaseModel):
    timestamp: str
    photo_url: Optional[str] = None
    description: Optional[str] = None
    estimated_calories: Optional[int] = None
    confidence: Optional[float] = None
    ai_confidence: Optional[float] = None
    ingredients_confirmed: bool = False
    ingredients: List[IngredientCreate] = []


class FoodEventResponse(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    photo_url: Optional[str] = None
    description: Optional[str] = None
    estimated_calories: Optional[int] = None
    confidence: Optional[float] = None
    ai_confidence: Optional[float] = None
    ingredients_confirmed: bool = False
    ingredients: List[IngredientResponse] = []

    class Config:
        from_attributes = True


# ---- BM Events ----

class BMEventCreate(BaseModel):
    user_id: str
    bristol_scale: int = Field(..., ge=1, le=7)
    color: Optional[str] = None
    notes: Optional[str] = None


class BMEventResponse(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    bristol_scale: int
    color: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Health Outcomes ----

class HealthOutcomeCreate(BaseModel):
    timestamp: str
    type: str
    severity: int = Field(..., ge=1, le=5)
    notes: Optional[str] = None
    bristol_scale: Optional[int] = None
    color: Optional[str] = None
    food_entry_id: Optional[str] = None


class HealthOutcomeResponse(BaseModel):
    id: str
    user_id: str
    food_entry_id: Optional[str] = None
    timestamp: datetime
    type: str
    severity: int
    notes: Optional[str] = None
    bristol_scale: Optional[int] = None
    color: Optional[str] = None
    food_entry: Optional[FoodEventResponse] = None

    class Config:
        from_attributes = True


# ---- Analysis ----

class TimelineEvent(BaseModel):
    id: str
    type: str
    timestamp: datetime
    data: dict


class IngredientCorrelation(BaseModel):
    ingredient: str
    avg_bristol: float
    event_count: int
    bristol_distribution: dict


class StatsResponse(BaseModel):
    total_food_events: int
    total_bm_events: int
    ingredient_correlations: List[IngredientCorrelation]


class PredictionWarning(BaseModel):
    ingredient: str
    message: str
    p_value: float
    confidence: str
    effect_size: float


class PredictionsResponse(BaseModel):
    user_id: str
    warnings: List[PredictionWarning]


class TriggerData(BaseModel):
    ingredient: str
    p_value: float
    effect_size: float
    sample_size: int
    confidence: str
    avg_severity_with: float
    avg_severity_without: float
    count_with: int
    count_without: int


class AnalysisRunResponse(BaseModel):
    user_id: str
    triggers_analyzed: int
    significant_triggers: int
    triggers: List[TriggerData]
    analyzed_at: Optional[str] = None