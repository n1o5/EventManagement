import uuid
import string
import random
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Enum, Text, UniqueConstraint
)
from sqlalchemy import Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    admin       = "admin"
    organizer   = "organizer"
    participant = "participant"


class SeatStatus(str, enum.Enum):
    available = "available"
    booked    = "booked"


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=generate_uuid)
    name            = Column(String(100), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role            = Column(Enum(UserRole), default=UserRole.participant, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    events   = relationship("Event",   back_populates="organizer")
    bookings = relationship("Booking", back_populates="user")
    reviews = relationship("Review", back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id            = Column(String, primary_key=True, default=generate_uuid)
    title         = Column(String(200), nullable=False)
    description   = Column(Text)
    organizer_id  = Column(String, ForeignKey("users.id"), nullable=False)
    venue         = Column(String(300), nullable=False)
    event_date    = Column(DateTime, nullable=False)
    total_rows    = Column(Integer, nullable=False, default=10)
    seats_per_row = Column(Integer, nullable=False, default=20)
    ticket_price = Column(Numeric(10, 2), nullable=False)
    image_url     = Column(String(500))
    category      = Column(String(100))
    is_published  = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    organizer = relationship("User",    back_populates="events")
    seats     = relationship("Seat",    back_populates="event", cascade="all, delete-orphan")
    bookings  = relationship("Booking", back_populates="event")
    reviews = relationship(
        "Review",
        back_populates="event",
        cascade="all, delete-orphan"
    )


class Seat(Base):
    __tablename__ = "seats"

    id          = Column(String, primary_key=True, default=generate_uuid)
    event_id    = Column(String, ForeignKey("events.id"), nullable=False)
    row_label   = Column(String(5), nullable=False)
    seat_number = Column(Integer, nullable=False)
    section     = Column(String(50), default="General")
    status      = Column(Enum(SeatStatus), default=SeatStatus.available, nullable=False)

    __table_args__ = (UniqueConstraint("event_id", "row_label", "seat_number"),)

    event = relationship("Event", back_populates="seats")


class Booking(Base):
    __tablename__ = "bookings"

    id           = Column(String, primary_key=True, default=generate_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    event_id     = Column(String, ForeignKey("events.id"), nullable=False)
    status       = Column(Enum(BookingStatus), default=BookingStatus.confirmed, nullable=False)
    total_amount = Column(Float, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    user          = relationship("User",    back_populates="bookings")
    event         = relationship("Event",   back_populates="bookings")
    booking_seats = relationship("BookingSeat", back_populates="booking", cascade="all, delete-orphan")


class BookingSeat(Base):
    __tablename__ = "booking_seats"

    id = Column(String, primary_key=True, default=generate_uuid)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    seat_id = Column(String, ForeignKey("seats.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("seat_id", name="uq_booking_seat_unique"),
    )

    booking = relationship(
        "Booking",
        back_populates="booking_seats"
    )

    seat = relationship("Seat")
    
class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=generate_uuid)

    rating = Column(Integer, nullable=False)
    comment = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(String, ForeignKey("users.id"))
    event_id = Column(String, ForeignKey("events.id"))
    event = relationship(
        "Event",
        back_populates="reviews"
    )

    user = relationship(
        "User",
        back_populates="reviews"
    )