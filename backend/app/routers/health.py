from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import User, FoodEvent, HealthOutcome
from ..schemas import HealthOutcomeCreate, HealthOutcomeResponse
from .auth import get_current_user

router = APIRouter(prefix="/health-outcomes", tags=["health_outcomes"])


@router.get("", response_model=List[HealthOutcomeResponse])
def get_health_outcomes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all health outcomes for the current user."""
    outcomes = (
        db.query(HealthOutcome)
        .filter(HealthOutcome.user_id == current_user.id)
        .order_by(HealthOutcome.timestamp.desc())
        .all()
    )
    return outcomes


@router.post("", response_model=HealthOutcomeResponse)
def create_health_outcome(
    data: HealthOutcomeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new health outcome."""
    # Validate food entry if linked
    food_entry = None
    if data.food_entry_id:
        food_entry = db.query(FoodEvent).filter(
            FoodEvent.id == data.food_entry_id,
            FoodEvent.user_id == current_user.id,
        ).first()

        if not food_entry:
            raise HTTPException(
                status_code=400,
                detail="Food entry not found or does not belong to user",
            )

        # Check 24h window
        food_time = food_entry.timestamp
        outcome_time = datetime.fromisoformat(data.timestamp.replace("Z", "+00:00"))
        hours_diff = abs((outcome_time - food_time).total_seconds()) / 3600

        if hours_diff > 24:
            raise HTTPException(
                status_code=400,
                detail="Health outcome must be linked to a food entry within 24 hours",
            )

    outcome = HealthOutcome(
        user_id=current_user.id,
        food_entry_id=data.food_entry_id,
        timestamp=datetime.fromisoformat(data.timestamp.replace("Z", "+00:00")),
        type=data.type,
        severity=data.severity,
        notes=data.notes,
        bristol_scale=data.bristol_scale,
        color=data.color,
    )
    db.add(outcome)
    db.commit()
    db.refresh(outcome)
    return outcome