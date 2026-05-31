from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, UserRole, Event, Seat, SeatStatus, Booking, BookingSeat, BookingStatus
from auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/analytics")
def platform_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    total_users       = db.query(func.count(User.id)).scalar() or 0
    organizer_count   = db.query(func.count(User.id)).filter(User.role == UserRole.organizer).scalar() or 0
    participant_count = db.query(func.count(User.id)).filter(User.role == UserRole.participant).scalar() or 0
    total_events      = db.query(func.count(Event.id)).scalar() or 0
    published_events  = db.query(func.count(Event.id)).filter(Event.is_published == True).scalar() or 0

    confirmed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.confirmed).all()
    total_revenue  = sum(b.total_amount for b in confirmed_bookings)
    total_bookings = len(confirmed_bookings)

    seats_sold = (
        db.query(func.count(BookingSeat.id))
        .join(Booking, Booking.id == BookingSeat.booking_id)
        .filter(Booking.status == BookingStatus.confirmed)
        .scalar() or 0
    )
    total_seats = db.query(func.count(Seat.id)).scalar() or 1
    avg_fill = round(seats_sold / total_seats * 100, 1)

    # Revenue by day — last 60 days
    cutoff = datetime.utcnow() - timedelta(days=60)
    daily_rev: dict = defaultdict(float)
    daily_bk:  dict = defaultdict(int)
    for b in confirmed_bookings:
        if b.created_at and b.created_at >= cutoff:
            d = b.created_at.strftime("%Y-%m-%d")
            daily_rev[d] += b.total_amount
            daily_bk[d]  += 1

    revenue_over_time = []
    for i in range(60):
        d = (datetime.utcnow() - timedelta(days=59 - i)).strftime("%Y-%m-%d")
        revenue_over_time.append({"date": d, "revenue": round(daily_rev[d], 2), "bookings": daily_bk[d]})

    # Category breakdown
    events = db.query(Event).all()
    cat_rev: dict = defaultdict(float)
    cat_bk:  dict = defaultdict(int)
    for ev in events:
        cat = ev.category or "Uncategorised"
        for b in confirmed_bookings:
            if b.event_id == ev.id:
                cat_rev[cat] += b.total_amount
                cat_bk[cat]  += 1

    category_breakdown = sorted(
        [{"category": k, "revenue": round(cat_rev[k], 2), "bookings": cat_bk[k]} for k in cat_rev],
        key=lambda x: x["revenue"], reverse=True,
    )

    # Top 10 events
    ev_rev: dict = defaultdict(float)
    ev_bk:  dict = defaultdict(int)
    for b in confirmed_bookings:
        ev_rev[b.event_id] += b.total_amount
        ev_bk[b.event_id]  += 1

    ev_lookup = {e.id: e for e in events}
    top_events = sorted(
        [{"id": eid, "title": ev_lookup[eid].title if eid in ev_lookup else "Unknown",
          "category": ev_lookup[eid].category if eid in ev_lookup else None,
          "revenue": round(rev, 2), "bookings": ev_bk[eid]}
         for eid, rev in ev_rev.items() if eid in ev_lookup],
        key=lambda x: x["revenue"], reverse=True,
    )[:10]

    # User growth — last 30 days
    all_users = db.query(User).filter(User.role != UserRole.admin).all()
    user_daily: dict = defaultdict(int)
    cutoff30 = datetime.utcnow() - timedelta(days=30)
    for u in all_users:
        if u.created_at and u.created_at >= cutoff30:
            user_daily[u.created_at.strftime("%Y-%m-%d")] += 1

    user_growth = []
    for i in range(30):
        d = (datetime.utcnow() - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        user_growth.append({"date": d, "users": user_daily[d]})

    return {
        "summary": {
            "total_users": total_users, "organizer_count": organizer_count,
            "participant_count": participant_count, "total_events": total_events,
            "published_events": published_events, "total_bookings": total_bookings,
            "seats_sold": seats_sold, "total_revenue": round(total_revenue, 2),
            "avg_fill_pct": avg_fill,
        },
        "revenue_over_time":  revenue_over_time,
        "user_growth":        user_growth,
        "category_breakdown": category_breakdown,
        "top_events":         top_events,
    }


@router.get("/organizers")
def list_organizers(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    organizers = db.query(User).filter(User.role == UserRole.organizer).all()
    result = []
    for org in organizers:
        events    = db.query(Event).filter(Event.organizer_id == org.id).all()
        event_ids = [e.id for e in events]
        bookings  = (
            db.query(Booking)
            .filter(Booking.event_id.in_(event_ids), Booking.status == BookingStatus.confirmed)
            .all()
        ) if event_ids else []
        revenue    = sum(b.total_amount for b in bookings)
        seats_sold = (
            db.query(func.count(BookingSeat.id))
            .join(Booking, Booking.id == BookingSeat.booking_id)
            .filter(Booking.event_id.in_(event_ids), Booking.status == BookingStatus.confirmed)
            .scalar() or 0
        ) if event_ids else 0
        total_cap = sum(e.total_rows * e.seats_per_row for e in events)
        result.append({
            "id": org.id, "name": org.name, "email": org.email,
            "joined": org.created_at.isoformat() if org.created_at else None,
            "event_count": len(events), "published": sum(1 for e in events if e.is_published),
            "total_capacity": total_cap, "seats_sold": seats_sold,
            "fill_pct": round(seats_sold / total_cap * 100, 1) if total_cap else 0,
            "total_bookings": len(bookings), "total_revenue": round(revenue, 2),
        })
    result.sort(key=lambda x: x["total_revenue"], reverse=True)
    return result


@router.get("/organizers/{organizer_id}")
def organizer_detail(
    organizer_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    org = db.query(User).filter(User.id == organizer_id, User.role == UserRole.organizer).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizer not found")

    events    = db.query(Event).filter(Event.organizer_id == organizer_id).all()
    event_ids = [e.id for e in events]
    bookings  = (
        db.query(Booking)
        .filter(Booking.event_id.in_(event_ids), Booking.status == BookingStatus.confirmed)
        .all()
    ) if event_ids else []

    events_detail = []
    for ev in events:
        ev_bks   = [b for b in bookings if b.event_id == ev.id]
        capacity = ev.total_rows * ev.seats_per_row
        booked   = db.query(func.count(Seat.id)).filter(
            Seat.event_id == ev.id, Seat.status == SeatStatus.booked
        ).scalar() or 0
        events_detail.append({
            "id": ev.id, "title": ev.title, "category": ev.category,
            "event_date": ev.event_date.isoformat(), "venue": ev.venue,
            "ticket_price": ev.ticket_price, "capacity": capacity, "booked": booked,
            "fill_pct": round(booked / capacity * 100, 1) if capacity else 0,
            "revenue": round(sum(b.total_amount for b in ev_bks), 2),
            "bookings": len(ev_bks), "published": ev.is_published,
        })
    events_detail.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "organizer": {"id": org.id, "name": org.name, "email": org.email,
                      "joined": org.created_at.isoformat() if org.created_at else None},
        "summary":   {"total_events": len(events), "total_bookings": len(bookings),
                      "total_revenue": round(sum(b.total_amount for b in bookings), 2)},
        "events":    events_detail,
    }
