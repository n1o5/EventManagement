import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Event, Seat, SeatStatus, Review
from schemas import EventCreate, EventUpdate, EventOut, SeatOut, ReviewCreate, ReviewOut
from auth import get_current_user, require_organizer

router = APIRouter(prefix="/api/events", tags=["events"])


def _generate_seats(db: Session, event: Event):
    """Create seat rows for a newly created event."""
    rows = list(string.ascii_uppercase[: event.total_rows])
    seats = []
    for row in rows:
        for num in range(1, event.seats_per_row + 1):
            section = "VIP" if row in ("A", "B") else "General"
            seat = Seat(
                event_id=event.id,
                row_label=row,
                seat_number=num,
                section=section,
                status=SeatStatus.available,
            )
            seats.append(seat)
    db.bulk_save_objects(seats)
    db.commit()


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = Event(**payload.model_dump(), organizer_id=current_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    _generate_seats(db, event)
    return _enrich(event, db)


@router.get("", response_model=List[EventOut])
def list_events(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Event).filter(Event.is_published == True)
    if search:
        q = q.filter(Event.title.ilike(f"%{search}%"))
    if category:
        q = q.filter(Event.category == category)
    events = q.order_by(Event.event_date).offset(skip).limit(limit).all()
    return [_enrich(e, db) for e in events]


@router.get("/my", response_model=List[EventOut])
def my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    events = db.query(Event).filter(Event.organizer_id == current_user.id).all()
    return [_enrich(e, db) for e in events]


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _enrich(event, db)


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = db.query(Event).filter(Event.id == event_id, Event.organizer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not yours")
    for key, val in payload.model_dump(exclude_none=True).items():
        setattr(event, key, val)
    db.commit()
    db.refresh(event)
    return _enrich(event, db)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = db.query(Event).filter(Event.id == event_id, Event.organizer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not yours")
    db.delete(event)
    db.commit()


@router.get("/{event_id}/seats", response_model=dict)
def get_seat_map(event_id: str, db: Session = Depends(get_db)):
    """Return seat map grouped by row."""
    seats = (
        db.query(Seat)
        .filter(Seat.event_id == event_id)
        .order_by(Seat.row_label, Seat.seat_number)
        .all()
    )
    if not seats:
        raise HTTPException(status_code=404, detail="Event not found")

    rows: dict = {}
    for seat in seats:
        rows.setdefault(seat.row_label, []).append(SeatOut.model_validate(seat).model_dump())
    return {"event_id": event_id, "rows": rows}

@router.post("/{event_id}/reviews", response_model=ReviewOut)
def create_review(
    event_id: str,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = Review(
        rating=payload.rating,
        comment=payload.comment,
        event_id=event_id,
        user_id=current_user.id,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
        "user_name": current_user.name,
    }


@router.get("/{event_id}/reviews", response_model=List[ReviewOut])
def get_reviews(
    event_id: str,
    db: Session = Depends(get_db),
):
    reviews = (
        db.query(Review)
        .filter(Review.event_id == event_id)
        .all()
    )

    return [
        {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "user_name": review.user.name,
        }
        for review in reviews
    ]
# ── Helpers ────────────────────────────────────────────────────────────────────

def _enrich(event: Event, db: Session) -> EventOut:
    available = db.query(Seat).filter(
        Seat.event_id == event.id, Seat.status == SeatStatus.available
    ).count()
    out = EventOut.model_validate(event)
    out.available_seats = available
    return out

