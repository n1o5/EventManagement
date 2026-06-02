from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Booking, BookingSeat, Seat, SeatStatus, Event, BookingStatus
from schemas import BookingCreate
from auth import get_current_user
from services.email_service import send_ticket_email

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


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
    # Locks these exact rows for the duration of this transaction.
    # Concurrent requests for the same seat_ids will block here
    # until this transaction commits or rolls back.
    seats = (
        db.query(Seat)
        .filter(Seat.id.in_(payload.seat_ids))
        .with_for_update()
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

    # BUG 2 FIX: cast Numeric ticket_price to float before arithmetic
    # so total_amount is always a plain float — no Decimal surprises.
    total = float(event.ticket_price) * len(seats)

    booking = Booking(
        user_id=current_user.id, event_id=payload.event_id,
        status=BookingStatus.confirmed, total_amount=total,
    )
    db.add(booking)
    db.flush()  # gives us booking.id before commit

    for seat in seats:
        seat.status = SeatStatus.booked
        db.add(BookingSeat(booking_id=booking.id, seat_id=seat.id))

    db.commit()   # row-level lock is released here
    db.refresh(booking)

    # BUG 1 FIX: email + return were missing — added back
    try:
        send_ticket_email(
            to_email=current_user.email,
            user_name=current_user.name,
            booking_id=booking.id,
            event_title=event.title,
            event_date=event.event_date,
            venue=event.venue,
            seats=[f"{s.row_label}{s.seat_number}" for s in seats],
            total_amount=total,
        )
    except Exception:
        pass  # email failure must never fail the booking

    return _out(booking, event)


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
    return [_out(b, db.query(Event).filter(Event.id == b.event_id).first())
            for b in bookings]


@router.get("/{booking_id}")
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    b = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _out(b, db.query(Event).filter(Event.id == b.event_id).first())


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG 4 FIX: lock the booking row before reading its status.
    # Without this, two concurrent cancel requests both see "confirmed"
    # and both proceed — the seat ends up freed twice.
    b = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.user_id == current_user.id)
        .with_for_update()
        .first()
    )
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
        "event_title":    event.title                  if event else "Unknown",
        "event_date":     event.event_date.isoformat() if event else None,
        "event_venue":    event.venue                  if event else None,
        "event_category": event.category               if event else None,
        "status":         b.status,
        "total_amount":   b.total_amount,
        "created_at":     b.created_at.isoformat()     if b.created_at else None,
        "seats": [
            {
                "id":          bs.seat.id,
                "row_label":   bs.seat.row_label,
                "seat_number": bs.seat.seat_number,
                "section":     bs.seat.section,
                "status":      bs.seat.status,
            }
            for bs in b.booking_seats
        ],
    }