from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, Event, Seat, SeatStatus, Booking, BookingSeat, BookingStatus
from auth import require_organizer

router = APIRouter(prefix="/api/organizer", tags=["organizer"])


@router.get("/analytics")
def organizer_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    events    = db.query(Event).filter(Event.organizer_id == current_user.id).all()
    event_ids = [e.id for e in events]
    if not event_ids:
        return _empty()

    bookings = (
        db.query(Booking)
        .filter(Booking.event_id.in_(event_ids), Booking.status == BookingStatus.confirmed)
        .all()
    )
    total_revenue  = sum(b.total_amount for b in bookings)
    total_bookings = len(bookings)
    seats_sold = (
        db.query(func.count(BookingSeat.id))
        .join(Booking, Booking.id == BookingSeat.booking_id)
        .filter(Booking.event_id.in_(event_ids), Booking.status == BookingStatus.confirmed)
        .scalar() or 0
    )
    total_capacity = sum(e.total_rows * e.seats_per_row for e in events)
    avg_fill = round(seats_sold / total_capacity * 100, 1) if total_capacity else 0

    # Revenue by day — last 30 days
    cutoff = datetime.utcnow() - timedelta(days=30)
    daily: dict = defaultdict(float)
    daily_bk: dict = defaultdict(int)
    for b in bookings:
        if b.created_at and b.created_at >= cutoff:
            d = b.created_at.strftime("%Y-%m-%d")
            daily[d]    += b.total_amount
            daily_bk[d] += 1

    revenue_over_time = []
    for i in range(30):
        d = (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        revenue_over_time.append({"date": d, "revenue": round(daily[d], 2), "bookings": daily_bk[d]})

    # Category breakdown
    cat_rev: dict = defaultdict(float)
    cat_bk:  dict = defaultdict(int)
    for ev in events:
        cat = ev.category or "Uncategorised"
        for b in bookings:
            if b.event_id == ev.id:
                cat_rev[cat] += b.total_amount
                cat_bk[cat]  += 1

    category_breakdown = sorted(
        [{"category": k, "revenue": round(cat_rev[k], 2), "bookings": cat_bk[k]} for k in cat_rev],
        key=lambda x: x["revenue"], reverse=True,
    )

    # Per-event breakdown
    events_breakdown = []
    for ev in events:
        ev_bks   = [b for b in bookings if b.event_id == ev.id]
        capacity = ev.total_rows * ev.seats_per_row
        booked   = db.query(func.count(Seat.id)).filter(
            Seat.event_id == ev.id, Seat.status == SeatStatus.booked
        ).scalar() or 0
        events_breakdown.append({
            "id": ev.id, "title": ev.title, "category": ev.category,
            "event_date": ev.event_date.isoformat(), "venue": ev.venue,
            "capacity": capacity, "booked": booked, "available": capacity - booked,
            "fill_pct": round(booked / capacity * 100, 1) if capacity else 0,
            "revenue": round(sum(b.total_amount for b in ev_bks), 2),
            "bookings_count": len(ev_bks), "ticket_price": ev.ticket_price,
            "is_published": ev.is_published,
        })
    events_breakdown.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "summary": {
            "total_events":     len(events),
            "published_events": sum(1 for e in events if e.is_published),
            "total_capacity":   total_capacity,
            "seats_sold":       seats_sold,
            "total_bookings":   total_bookings,
            "total_revenue":    round(total_revenue, 2),
            "avg_fill_pct":     avg_fill,
        },
        "revenue_over_time":  revenue_over_time,
        "events_breakdown":   events_breakdown,
        "category_breakdown": category_breakdown,
    }


@router.get("/analytics/events/{event_id}")
def event_analytics(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    event = db.query(Event).filter(
        Event.id == event_id, Event.organizer_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or not yours")

    seats        = db.query(Seat).filter(Seat.event_id == event_id).all()
    capacity     = len(seats)
    booked_seats = [s for s in seats if s.status == SeatStatus.booked]
    avail_seats  = [s for s in seats if s.status == SeatStatus.available]

    vip_total  = sum(1 for s in seats if s.section == "VIP")
    vip_booked = sum(1 for s in booked_seats if s.section == "VIP")
    gen_total  = capacity - vip_total
    gen_booked = len(booked_seats) - vip_booked

    bookings = (
        db.query(Booking)
        .filter(Booking.event_id == event_id, Booking.status == BookingStatus.confirmed)
        .order_by(Booking.created_at)
        .all()
    )
    revenue = sum(b.total_amount for b in bookings)

    cutoff = datetime.utcnow() - timedelta(days=30)
    daily: dict = defaultdict(float)
    for b in bookings:
        if b.created_at and b.created_at >= cutoff:
            daily[b.created_at.strftime("%Y-%m-%d")] += b.total_amount

    daily_series = []
    for i in range(30):
        d = (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        daily_series.append({"date": d, "revenue": round(daily[d], 2)})

    row_fill: dict = defaultdict(lambda: {"total": 0, "booked": 0})
    for s in seats:
        row_fill[s.row_label]["total"] += 1
    for s in booked_seats:
        row_fill[s.row_label]["booked"] += 1

    row_heatmap = [
        {"row": r, "total": d["total"], "booked": d["booked"],
         "fill_pct": round(d["booked"] / d["total"] * 100, 1) if d["total"] else 0}
        for r, d in sorted(row_fill.items())
    ]

    return {
        "event": {
            "id": event.id, "title": event.title,
            "event_date": event.event_date.isoformat(),
            "ticket_price": event.ticket_price, "venue": event.venue,
        },
        "seats": {
            "capacity": capacity, "booked": len(booked_seats),
            "available": len(avail_seats),
            "fill_pct": round(len(booked_seats) / capacity * 100, 1) if capacity else 0,
            "vip":     {"total": vip_total,  "booked": vip_booked,
                        "fill_pct": round(vip_booked / vip_total * 100, 1) if vip_total else 0},
            "general": {"total": gen_total,  "booked": gen_booked,
                        "fill_pct": round(gen_booked / gen_total * 100, 1) if gen_total else 0},
        },
        "revenue": {
            "total": round(revenue, 2),
            "avg_per_booking": round(revenue / len(bookings), 2) if bookings else 0,
            "daily": daily_series,
        },
        "bookings_count": len(bookings),
        "row_heatmap":    row_heatmap,
    }


@router.get("/events")
def organizer_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_organizer),
):
    events = db.query(Event).filter(Event.organizer_id == current_user.id).all()
    result = []
    for ev in events:
        capacity = ev.total_rows * ev.seats_per_row
        booked   = db.query(func.count(Seat.id)).filter(
            Seat.event_id == ev.id, Seat.status == SeatStatus.booked
        ).scalar() or 0
        result.append({
            "id": ev.id, "title": ev.title, "venue": ev.venue,
            "event_date": ev.event_date.isoformat(), "category": ev.category,
            "ticket_price": ev.ticket_price, "is_published": ev.is_published,
            "total_rows": ev.total_rows, "seats_per_row": ev.seats_per_row,
            "capacity": capacity, "booked": booked, "available": capacity - booked,
        })
    return result


def _empty():
    return {
        "summary": {
            "total_events": 0, "published_events": 0, "total_capacity": 0,
            "seats_sold": 0, "total_bookings": 0, "total_revenue": 0, "avg_fill_pct": 0,
        },
        "revenue_over_time": [], "events_breakdown": [], "category_breakdown": [],
    }
