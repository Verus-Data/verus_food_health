from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from ..database import get_db
from ..models import User, FoodEvent, Ingredient
from ..schemas import UserResponse, FoodEventCreate, FoodEventResponse
from datetime import datetime, timedelta

router = APIRouter(prefix="/users", tags=["users"])

UPLOAD_DIR = "app/uploads"


@router.post("/", response_model=UserResponse)
def create_user(db: Session = Depends(get_db)):
    user = User()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/food", response_model=FoodEventResponse)
async def create_food_event(
    user_id: str,
    ingredients: str = Form(...),
    notes: str = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    photo_path = None
    if photo:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{timestamp}_{photo.filename}"
        photo_path = os.path.join(UPLOAD_DIR, filename)
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

    food_event = FoodEvent(user_id=user_id, photo_path=photo_path, notes=notes)
    db.add(food_event)

    ingredient_names = [i.strip().lower() for i in ingredients.split(",") if i.strip()]
    for name in ingredient_names:
        ingredient = db.query(Ingredient).filter(Ingredient.name == name).first()
        if not ingredient:
            ingredient = Ingredient(name=name)
            db.add(ingredient)
        food_event.ingredients.append(ingredient)

    db.commit()
    db.refresh(food_event)
    return food_event


@router.get("/{user_id}/food", response_model=List[FoodEventResponse])
def get_user_food_events(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(FoodEvent)
        .filter(FoodEvent.user_id == user_id)
        .order_by(FoodEvent.timestamp.desc())
        .all()
    )
