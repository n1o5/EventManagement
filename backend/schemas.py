from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from models import UserRole, SeatStatus, BookingStatus


class UserRegister(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     UserRole = UserRole.participant

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserOut(BaseModel):
    id:         str
    name:       str
    email:      str
    role:       UserRole
    created_at: datetime
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


class EventCreate(BaseModel):
    title:         str
    description:   Optional[str] = None
    venue:         str
    event_date:    datetime
    total_rows:    int   = 10
    seats_per_row: int   = 20
    ticket_price:  float
    image_url:     Optional[str] = None
    category:      Optional[str] = None


class EventUpdate(BaseModel):
    title:         Optional[str]      = None
    description:   Optional[str]      = None
    venue:         Optional[str]      = None
    event_date:    Optional[datetime] = None
    ticket_price:  Optional[float]    = None
    image_url:     Optional[str]      = None
    category:      Optional[str]      = None
    is_published:  Optional[bool]     = None


class EventOut(BaseModel):
    id:              str
    title:           str
    description:     Optional[str]
    venue:           str
    event_date:      datetime
    total_rows:      int
    seats_per_row:   int
    ticket_price:    float
    image_url:       Optional[str]
    category:        Optional[str]
    is_published:    bool
    created_at:      datetime
    organizer:       UserOut
    available_seats: Optional[int] = None
    model_config = {"from_attributes": True}


class SeatOut(BaseModel):
    id:          str
    row_label:   str
    seat_number: int
    section:     str
    status:      SeatStatus
    model_config = {"from_attributes": True}


class BookingCreate(BaseModel):
    event_id: str
    seat_ids: List[str]


class BookingOut(BaseModel):
    id:           str
    event_id:     str
    status:       BookingStatus
    total_amount: float
    created_at:   datetime
    seats:        List[SeatOut] = []
    model_config = {"from_attributes": True}

class ReviewCreate(BaseModel):
    rating: int
    comment: str


class ReviewOut(BaseModel):
    id: str
    rating: int
    comment: str
    created_at: datetime
    user_name: str
    model_config = {"from_attributes": True}