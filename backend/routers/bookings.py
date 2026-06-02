from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Booking, BookingSeat, Seat, SeatStatus, Event, BookingStatus
from schemas import BookingCreate
from auth import get_current_user
from services.email_service import send_ticket_email

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

@router.post("", status_code=201)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # SELECT ... FOR UPDATE
    # This locks the rows at the DB level for the duration of the transaction.
    # Any other transaction trying to read these same rows will block
    # until this one commits or rolls back — not just skip past.
    seats = (
        db.query(Seat)
        .filter(Seat.id.in_(payload.seat_ids))
        .with_for_update()          # ← the key line
        .all()
    )

    if len(seats) != len(payload.seat_ids):
        raise HTTPException(status_code=400, detail="One or more seats not found")

    unavailable = [s for s in seats if s.status != SeatStatus.available]
    if unavailable:
        raise HTTPException(
            status_code=409,
            detail=f"Seats already taken: "
                   f"{[s.row_label + str(s.seat_number) for s in unavailable]}",
        )

    total   = event.ticket_price * len(seats)
    booking = Booking(
        user_id=current_user.id, event_id=payload.event_id,
        status=BookingStatus.confirmed, total_amount=total,
    )
    db.add(booking)
    db.flush()

    for seat in seats:
        seat.status = SeatStatus.booked
        db.add(BookingSeat(booking_id=booking.id, seat_id=seat.id))

    db.commit()   # lock is released here
    db.refresh(booking)

@router.get("")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_out(b, db.query(Event).filter(Event.id == b.event_id).first()) for b in bookings]


@router.get("/{booking_id}")
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _out(b, db.query(Event).filter(Event.id == b.event_id).first())


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b.status == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Already cancelled")
    b.status = BookingStatus.cancelled
    for bs in b.booking_seats:
        bs.seat.status = SeatStatus.available
    db.commit()


def _out(b: Booking, event: Event | None) -> dict:
    return {
        "id":             b.id,
        "event_id":       b.event_id,
        "event_title":    event.title              if event else "Unknown",
        "event_date":     event.event_date.isoformat() if event else None,
        "event_venue":    event.venue              if event else None,
        "event_category": event.category           if event else None,
        "status":         b.status,
        "total_amount":   b.total_amount,
        "created_at":     b.created_at.isoformat() if b.created_at else None,
        "seats": [
            {"id": bs.seat.id, "row_label": bs.seat.row_label,
             "seat_number": bs.seat.seat_number, "section": bs.seat.section,
             "status": bs.seat.status}
            for bs in b.booking_seats
        ],
    }
