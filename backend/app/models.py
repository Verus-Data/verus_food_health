from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Table, Float, Boolean
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
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    food_events = relationship("FoodEvent", back_populates="user")
    bm_events = relationship("BMEvent", back_populates="user")
    health_outcomes = relationship("HealthOutcome", back_populates="user")
    personal_triggers = relationship("PersonalTrigger", back_populates="user")
    daily_trends = relationship("DailyTrend", back_populates="user")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    source = Column(String(50), default="manual")
    food_event_id = Column(String(36), ForeignKey("food_events.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    food_event = relationship("FoodEvent", back_populates="ingredients_list")
    food_events = relationship(
        "FoodEvent", secondary=food_ingredient_association, back_populates="ingredients"
    )


class FoodEvent(Base):
    __tablename__ = "food_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    photo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    estimated_calories = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ingredients_confirmed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="food_events")
    ingredients = relationship(
        "Ingredient",
        secondary=food_ingredient_association,
        back_populates="food_events",
    )
    ingredients_list = relationship("Ingredient", back_populates="food_event")
    health_outcomes = relationship("HealthOutcome", back_populates="food_entry")


class BMEvent(Base):
    __tablename__ = "bm_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    bristol_scale = Column(Integer, nullable=False)
    color = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="bm_events")


class HealthOutcome(Base):
    __tablename__ = "health_outcomes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    food_entry_id = Column(String(36), ForeignKey("food_events.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    type = Column(String(50), nullable=False)
    severity = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    bristol_scale = Column(Integer, nullable=True)
    color = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="health_outcomes")
    food_entry = relationship("FoodEvent", back_populates="health_outcomes")


class PersonalTrigger(Base):
    __tablename__ = "personal_triggers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    ingredient = Column(String(100), nullable=False)
    p_value = Column(Float, nullable=False)
    effect_size = Column(Float, nullable=False)
    sample_size = Column(Integer, nullable=False)
    confidence = Column(String(50), nullable=False)
    avg_severity_with = Column(Float, nullable=False)
    avg_severity_without = Column(Float, nullable=False)
    count_with = Column(Integer, nullable=True)
    count_without = Column(Integer, nullable=True)
    last_analyzed = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="personal_triggers")

    __table_args__ = (
        # UniqueConstraint('user_id', 'ingredient', name='uq_user_ingredient'),
    )


class DailyTrend(Base):
    __tablename__ = "daily_trends"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    avg_bm_severity = Column(Float, nullable=True)
    avg_energy = Column(Float, nullable=True)
    top_symptom = Column(String(100), nullable=True)
    trigger_count = Column(Integer, default=0)
    food_count = Column(Integer, default=0)
    outcome_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="daily_trends")

    __table_args__ = (
        # UniqueConstraint('user_id', 'date', name='uq_user_date'),
    )