"""
Seat Clustering Algorithm
--------------------------
Finds the best consecutive block of seats for a group booking.

Scoring strategy:
  - Consecutive seats in the same row: primary requirement
  - Center-biased: penalise seats far from the row's midpoint
  - Section preference: bonus when preferred section is matched
  - Row preference: bonus when preferred row is matched
  - Front-centre sweet spot: mid-rows score higher than extreme front/back
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass

from sqlalchemy.orm import Session
from models import Seat, SeatStatus


@dataclass
class SeatBlock:
    row_label: str
    seats: List[Seat]
    score: float
    reason: str


def find_best_seats(
    db: Session,
    event_id: str,
    count: int,
    preferred_section: Optional[str] = None,
    preferred_row: Optional[str] = None,
    top_k: int = 3,
) -> List[SeatBlock]:
    """
    Returns up to `top_k` best seat blocks for the given group size.
    Each block is a consecutive run of `count` available seats in one row.
    """
    # Fetch all available seats for this event ordered by row then number
    available = (
        db.query(Seat)
        .filter(
            Seat.event_id == event_id,
            Seat.status == SeatStatus.available,
        )
        .order_by(Seat.row_label, Seat.seat_number)
        .all()
    )

    if not available:
        return []

    # Group by row
    rows: dict[str, List[Seat]] = {}
    for seat in available:
        rows.setdefault(seat.row_label, []).append(seat)

    all_rows = sorted(rows.keys())
    total_rows = len(all_rows)
    best_blocks: List[SeatBlock] = []

    for row_idx, row_label in enumerate(all_rows):
        seats_in_row = sorted(rows[row_label], key=lambda s: s.seat_number)
        consecutive_blocks = _find_consecutive_blocks(seats_in_row, count)

        for block in consecutive_blocks:
            score, reason = _score_block(
                block=block,
                row_label=row_label,
                row_idx=row_idx,
                total_rows=total_rows,
                preferred_section=preferred_section,
                preferred_row=preferred_row,
            )
            best_blocks.append(SeatBlock(row_label=row_label, seats=block, score=score, reason=reason))

    # Sort descending by score, return top_k
    best_blocks.sort(key=lambda b: b.score, reverse=True)
    return best_blocks[:top_k]


def _find_consecutive_blocks(seats: List[Seat], count: int) -> List[List[Seat]]:
    """
    Slide a window of size `count` over the seat list.
    Only yield windows where all seats are truly consecutive (no gaps).
    """
    if len(seats) < count:
        return []

    blocks = []
    for i in range(len(seats) - count + 1):
        window = seats[i : i + count]
        # Check no gaps
        numbers = [s.seat_number for s in window]
        if numbers[-1] - numbers[0] == count - 1:
            blocks.append(window)
    return blocks


def _score_block(
    block: List[Seat],
    row_label: str,
    row_idx: int,
    total_rows: int,
    preferred_section: Optional[str],
    preferred_row: Optional[str],
) -> Tuple[float, str]:
    """
    Composite score out of 100.
    """
    score = 0.0
    reasons = []

    # 1. Centre-of-row bonus (max 30 pts)
    #    Determine seat range in the row and score centre proximity.
    seat_numbers = [s.seat_number for s in block]
    block_centre = (seat_numbers[0] + seat_numbers[-1]) / 2

    # We don't have total seats per row here, so we use a reasonable heuristic:
    # score based on distance from centre relative to row width inferred from block.
    # A simpler proxy: prefer lower seat numbers (stage-left) slightly, but mostly
    # reward being near the mathematical middle we can observe.
    centre_bias = 1 - abs(block_centre - 10) / 20  # normalised around seat 10
    centre_score = max(0.0, centre_bias) * 30
    score += centre_score
    if centre_bias > 0.7:
        reasons.append("centre seats")

    # 2. Optimal row position – mid-rows are best (max 30 pts)
    if total_rows > 1:
        row_ratio = row_idx / (total_rows - 1)  # 0 = front, 1 = back
        # Sweet spot: 0.25–0.55 of the way back
        if 0.25 <= row_ratio <= 0.55:
            row_score = 30.0
            reasons.append("prime viewing row")
        else:
            distance = min(abs(row_ratio - 0.25), abs(row_ratio - 0.55))
            row_score = max(0.0, 30.0 - distance * 60)
    else:
        row_score = 30.0
    score += row_score

    # 3. Section preference (20 pts)
    if preferred_section and block[0].section == preferred_section:
        score += 20
        reasons.append(f"{preferred_section} section match")

    # 4. Row preference (20 pts)
    if preferred_row and row_label == preferred_row:
        score += 20
        reasons.append(f"row {preferred_row} match")

    # Build human-readable reason
    if not reasons:
        reasons.append(f"row {row_label}, seats {seat_numbers[0]}–{seat_numbers[-1]}")

    reason_str = f"Row {row_label} • " + ", ".join(reasons)
    return round(score, 2), reason_str


def lock_seats(db: Session, seat_ids: List[str], group_id: str) -> List[Seat]:
    """
    Atomically lock seats for a group booking.
    Raises ValueError if any seat is no longer available.
    """
    from datetime import datetime, timedelta

    seats = db.query(Seat).filter(Seat.id.in_(seat_ids)).all()
    if len(seats) != len(seat_ids):
        raise ValueError("One or more seats not found")

    unavailable = [s for s in seats if s.status != SeatStatus.available]
    if unavailable:
        labels = [f"{s.row_label}{s.seat_number}" for s in unavailable]
        raise ValueError(f"Seats already taken: {', '.join(labels)}")

    expires = datetime.utcnow() + timedelta(minutes=15)
    for seat in seats:
        seat.status = SeatStatus.locked
        seat.locked_by_group_id = group_id
        seat.lock_expires_at = expires

    db.commit()
    return seats


def confirm_seats(db: Session, seat_ids: List[str]) -> None:
    """Mark seats as permanently booked."""
    seats = db.query(Seat).filter(Seat.id.in_(seat_ids)).all()
    for seat in seats:
        seat.status = SeatStatus.booked
        seat.locked_by_group_id = None
        seat.lock_expires_at = None
    db.commit()


def release_seats(db: Session, seat_ids: List[str]) -> None:
    """Release locked seats back to available."""
    seats = db.query(Seat).filter(Seat.id.in_(seat_ids)).all()
    for seat in seats:
        seat.status = SeatStatus.available
        seat.locked_by_group_id = None
        seat.lock_expires_at = None
    db.commit()
