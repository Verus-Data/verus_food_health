from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from ..database import get_db
from ..models import User, FoodEvent, Ingredient, HealthOutcome
from ..schemas import FoodEventCreate, FoodEventResponse
from .auth import get_current_user

router = APIRouter(prefix="/food-entries", tags=["food_entries"])

UPLOAD_DIR = "uploads"


@router.get("", response_model=List[FoodEventResponse])
def get_food_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all food entries for the current user."""
    entries = (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == current_user.id)
        .order_by(FoodEvent.timestamp.desc())
        .all()
    )
    return entries


@router.post("", response_model=FoodEventResponse)
def create_food_entry(
    data: FoodEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new food entry."""
    food_entry = FoodEvent(
        user_id=current_user.id,
        timestamp=datetime.fromisoformat(data.timestamp.replace("Z", "+00:00")),
        photo_url=data.photo_url,
        description=data.description,
        estimated_calories=data.estimated_calories,
        confidence=data.confidence,
        ai_confidence=data.ai_confidence,
        ingredients_confirmed=data.ingredients_confirmed,
    )
    db.add(food_entry)

    # Create ingredients
    for ing in data.ingredients:
        ingredient = Ingredient(
            name=ing.name,
            source=ing.source,
        )
        db.add(ingredient)
        food_entry.ingredients.append(ingredient)

    db.commit()
    db.refresh(food_entry)
    return food_entry


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a photo and return the URL."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{current_user.id}_{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"photo_url": f"/uploads/{filename}"}