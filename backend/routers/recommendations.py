"""
Recommendations Router
-----------------------
GET /api/recommendations   – personalised events for the current user

Scoring algorithm:
  1. Pull the user's confirmed bookings → extract categories & price band
  2. Exclude events they've already booked
  3. Score every upcoming published event:
       +40  if category matches a booked category (weighted by frequency)
       +30  if price is within ±30 % of their average spend
       +20  if venue city matches a previously visited city
       +10  recency bonus (sooner events score slightly higher)
  4. Return top-N sorted by score, with an explanation tag
"""

from datetime import datetime
from typing import List
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, Event, Booking, BookingSeat, Seat, SeatStatus, BookingStatus
from schemas import EventOut
from auth import get_current_user
from routers.events import _enrich

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=List[dict])
def get_recommendations(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── 1. Build user preference profile ──────────────────────────────────────
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id, Booking.status == BookingStatus.confirmed)
        .all()
    )

    booked_event_ids = {b.event_id for b in bookings}
    booked_events = db.query(Event).filter(Event.id.in_(booked_event_ids)).all()

    category_counter = Counter(e.category for e in booked_events if e.category)
    prices = [e.ticket_price for e in booked_events]
    avg_price = sum(prices) / len(prices) if prices else 0

    # Extract city keywords from venue strings (last comma-separated token)
    def city(venue: str) -> str:
        parts = venue.split(",")
        return parts[-1].strip().lower() if parts else ""

    visited_cities = {city(e.venue) for e in booked_events}
    total_category_bookings = sum(category_counter.values()) or 1

    # ── 2. Candidate pool: upcoming, published, not already booked ────────────
    now = datetime.utcnow()
    candidates = (
        db.query(Event)
        .filter(
            Event.is_published == True,
            Event.event_date > now,
            Event.id.notin_(booked_event_ids),
        )
        .all()
    )

    # ── 3. Score each candidate ───────────────────────────────────────────────
    def score_event(event: Event):
        s = 0.0
        tags = []

        # Category match (weighted by how often user books that category)
        if event.category and event.category in category_counter:
            weight = category_counter[event.category] / total_category_bookings
            s += 40 * weight
            tags.append(f"You love {event.category}")

        # Price affinity (within ±30 % of average)
        if avg_price > 0:
            ratio = abs(event.ticket_price - avg_price) / avg_price
            if ratio <= 0.30:
                s += 30 * (1 - ratio / 0.30)
                if ratio <= 0.10:
                    tags.append("Matches your budget")

        # Venue city match
        if city(event.venue) in visited_cities and visited_cities:
            s += 20
            tags.append("Familiar venue city")

        # Recency bonus: events sooner score up to +10
        days_away = (event.event_date - now).days
        recency = max(0, 10 - days_away / 30)
        s += recency

        # New user fallback: give all events a base score so we return something
        if not booked_events:
            s += 20
            tags = ["Popular event"]

        return round(s, 2), tags or ["Trending"]

    scored = []
    for ev in candidates:
        sc, tags = score_event(ev)
        enriched = _enrich(ev, db)
        scored.append({
            **enriched.model_dump(),
            "recommendation_score": sc,
            "recommendation_tags": tags,
        })

    scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return scored[:limit]
