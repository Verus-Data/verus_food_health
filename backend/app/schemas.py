from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from uuid import UUID


class UserCreate(BaseModel):
    pass


class UserResponse(BaseModel):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class IngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class IngredientResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class FoodEventCreate(BaseModel):
    user_id: str
    ingredients: List[str]
    notes: Optional[str] = None


class FoodEventResponse(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    photo_path: Optional[str]
    notes: Optional[str]
    ingredients: List[IngredientResponse]

    class Config:
        from_attributes = True


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
    color: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


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
