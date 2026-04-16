from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

food_ingredient_association = Table(
    "food_ingredient",
    Base.metadata,
    Column("food_event_id", String(36), ForeignKey("food_events.id"), primary_key=True),
    Column("ingredient_id", String(36), ForeignKey("ingredients.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)

    food_events = relationship("FoodEvent", back_populates="user")
    bm_events = relationship("BMEvent", back_populates="user")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    food_events = relationship(
        "FoodEvent", secondary=food_ingredient_association, back_populates="ingredients"
    )


class FoodEvent(Base):
    __tablename__ = "food_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    photo_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="food_events")
    ingredients = relationship(
        "Ingredient",
        secondary=food_ingredient_association,
        back_populates="food_events",
    )


class BMEvent(Base):
    __tablename__ = "bm_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    bristol_scale = Column(Integer, nullable=False)
    color = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="bm_events")
