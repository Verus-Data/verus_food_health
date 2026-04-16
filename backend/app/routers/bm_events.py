from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, BMEvent
from ..schemas import BMEventCreate, BMEventResponse

router = APIRouter(prefix="/bm", tags=["bm_events"])


@router.post("/", response_model=BMEventResponse)
def create_bm_event(event: BMEventCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == event.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    bm_event = BMEvent(
        user_id=event.user_id,
        bristol_scale=event.bristol_scale,
        color=event.color,
        notes=event.notes,
    )
    db.add(bm_event)
    db.commit()
    db.refresh(bm_event)
    return bm_event


@router.get("/user/{user_id}", response_model=List[BMEventResponse])
def get_user_bm_events(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return (
        db.query(BMEvent)
        .filter(BMEvent.user_id == user_id)
        .order_by(BMEvent.timestamp.desc())
        .all()
    )


@router.get("/{event_id}", response_model=BMEventResponse)
def get_bm_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(BMEvent).filter(BMEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="BM event not found")
    return event
