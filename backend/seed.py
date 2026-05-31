"""
seed.py — Run once to populate the database with sample data.
  docker exec eventhub_backend python seed.py

Creates:
  1 admin         admin@eventhub.in      / admin123
  3 organizers    raj / sport / tech
  8 participants
 12 events         Music, Sports, Tech, Comedy, Art, Food
 ~80 bookings      realistic distribution
"""

import os, sys, uuid, string, random
from datetime import datetime, timedelta

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean,
    DateTime, ForeignKey, Enum, Text, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext
import enum

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@db:5432/eventdb")
engine  = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
Base    = declarative_base()
pwd     = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Inline models (no relative imports) ───────────────────────────────────────

def uid(): return str(uuid.uuid4())

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
    id              = Column(String, primary_key=True, default=uid)
    name            = Column(String(100), nullable=False)
    email           = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(Enum(UserRole), default=UserRole.participant)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    id            = Column(String, primary_key=True, default=uid)
    title         = Column(String(200), nullable=False)
    description   = Column(Text)
    organizer_id  = Column(String, ForeignKey("users.id"), nullable=False)
    venue         = Column(String(300), nullable=False)
    event_date    = Column(DateTime, nullable=False)
    total_rows    = Column(Integer, nullable=False, default=10)
    seats_per_row = Column(Integer, nullable=False, default=20)
    ticket_price  = Column(Float, nullable=False)
    image_url     = Column(String(500))
    category      = Column(String(100))
    is_published  = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Seat(Base):
    __tablename__ = "seats"
    id          = Column(String, primary_key=True, default=uid)
    event_id    = Column(String, ForeignKey("events.id"), nullable=False)
    row_label   = Column(String(5), nullable=False)
    seat_number = Column(Integer, nullable=False)
    section     = Column(String(50), default="General")
    status      = Column(Enum(SeatStatus), default=SeatStatus.available)
    __table_args__ = (UniqueConstraint("event_id", "row_label", "seat_number"),)

class Booking(Base):
    __tablename__ = "bookings"
    id           = Column(String, primary_key=True, default=uid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    event_id     = Column(String, ForeignKey("events.id"), nullable=False)
    status       = Column(Enum(BookingStatus), default=BookingStatus.confirmed)
    total_amount = Column(Float, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

class BookingSeat(Base):
    __tablename__ = "booking_seats"
    id         = Column(String, primary_key=True, default=uid)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=False)
    seat_id    = Column(String, ForeignKey("seats.id"), nullable=False)


Base.metadata.create_all(bind=engine)
db = Session()


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_user(name, email, password, role, days_ago=0):
    u = db.query(User).filter(User.email == email).first()
    if u: return u
    u = User(name=name, email=email, hashed_password=pwd.hash(password),
             role=role, created_at=datetime.utcnow() - timedelta(days=days_ago))
    db.add(u); db.flush(); return u


def make_event(org_id, title, venue, category, price, rows, spr, days, desc="", img=None):
    e = Event(
        title=title, description=desc, organizer_id=org_id, venue=venue,
        event_date=datetime.utcnow() + timedelta(days=days),
        total_rows=rows, seats_per_row=spr, ticket_price=price,
        category=category, is_published=True, image_url=img,
        created_at=datetime.utcnow() - timedelta(days=random.randint(5, 30)),
    )
    db.add(e); db.flush()
    seats = []
    for row in list(string.ascii_uppercase[:rows]):
        for num in range(1, spr + 1):
            seats.append(Seat(event_id=e.id, row_label=row, seat_number=num,
                              section="VIP" if row in ("A","B") else "General"))
    db.bulk_save_objects(seats); db.flush()
    return e


def book(user_id, event_id, price, n, days_ago=0):
    available = db.query(Seat).filter(
        Seat.event_id == event_id, Seat.status == SeatStatus.available
    ).limit(n).all()
    if len(available) < n: return
    b = Booking(user_id=user_id, event_id=event_id, status=BookingStatus.confirmed,
                total_amount=price * len(available),
                created_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0,23)))
    db.add(b); db.flush()
    for seat in available:
        seat.status = SeatStatus.booked
        db.add(BookingSeat(booking_id=b.id, seat_id=seat.id))
    db.flush()


# ── Users ──────────────────────────────────────────────────────────────────────

print("👤  Creating users…")
admin   = make_user("EventHub Admin",  "admin@eventhub.in",   "admin123",    UserRole.admin,       120)
raj     = make_user("Raj Productions", "raj@eventhub.in",     "password123", UserRole.organizer,    90)
sport   = make_user("SportZone Events","sport@eventhub.in",   "password123", UserRole.organizer,    75)
techco  = make_user("TechConf India",  "tech@eventhub.in",    "password123", UserRole.organizer,    60)
alice   = make_user("Alice Menon",     "alice@example.in",    "password123", UserRole.participant,  80)
priya   = make_user("Priya Nair",      "priya@example.in",    "password123", UserRole.participant,  70)
karthik = make_user("Karthik Rao",     "karthik@example.in",  "password123", UserRole.participant,  65)
rohan   = make_user("Rohan Mehta",     "rohan@example.in",    "password123", UserRole.participant,  55)
meera   = make_user("Meera Iyer",      "meera@example.in",    "password123", UserRole.participant,  45)
arjun   = make_user("Arjun Sharma",    "arjun@example.in",    "password123", UserRole.participant,  40)
divya   = make_user("Divya Krishnan",  "divya@example.in",    "password123", UserRole.participant,  30)
sanjay  = make_user("Sanjay Patel",    "sanjay@example.in",   "password123", UserRole.participant,  20)
users   = [alice, priya, karthik, rohan, meera, arjun, divya, sanjay]


# ── Events ─────────────────────────────────────────────────────────────────────

print("🎪  Creating events…")
coldplay = make_event(raj.id,   "Coldplay: Music of the Spheres Tour",   "DY Patil Stadium, Mumbai",              "Music",  4999, 15, 30, 28,  "Coldplay returns to India.",            "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800")
nh7      = make_event(raj.id,   "NH7 Weekender Bengaluru 2025",          "NICE Grounds, Bengaluru",               "Music",  2499, 12, 35, 45,  "Three stages, 50+ artists.")
vir_das  = make_event(raj.id,   "Vir Das: Losing It World Tour",         "JN Indoor Stadium, Chennai",            "Comedy",  999, 10, 25, 18,  "India's favourite comedian.")
kanan    = make_event(raj.id,   "Kanan Gill — Feelings",                 "Phoenix Marketcity, Pune",              "Comedy",  799,  8, 20, 12,  "Stand-up about feelings.")
rcb_mi   = make_event(sport.id, "IPL 2025: RCB vs MI — Bengaluru",       "M. Chinnaswamy Stadium, Bengaluru",     "Sports", 1299, 20, 40, 10,  "The greatest cricket rivalry.",         "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800")
marathon = make_event(sport.id, "Tata Mumbai Marathon 2025",             "Azad Maidan, Mumbai",                   "Sports",  599,  6, 50, 35,  "India's largest road race.")
kabaddi  = make_event(sport.id, "Pro Kabaddi League Finals",             "Sardar Patel Indoor Stadium, Ahmedabad","Sports",  699, 12, 30, 22,  "Ultimate showdown of speed and skill.")
pycon    = make_event(techco.id,"PyCon India 2025",                      "IISc Bangalore",                        "Tech",    799,  8, 50, 55,  "India's premier Python conference.",    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800")
aiconf   = make_event(techco.id,"AI & ML Summit India",                  "HICC, Hyderabad",                       "Tech",   2499, 10, 40, 40,  "AI research, products, workshops.",     "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800")
startup  = make_event(techco.id,"Unplugged: Startup Pitch Night",        "91Springboard, Mumbai",                 "Tech",    299,  5, 20,  8,  "10 startups. One winner.")
art_fair = make_event(raj.id,   "Art Bengaluru 2025",                    "BIEC, Bengaluru",                       "Art",     500,  6, 20, 15,  "South Asia's largest art fair.")
food_f   = make_event(sport.id, "The Great Indian Food Festival",        "Palace Grounds, Bengaluru",             "Food",    399,  8, 30, 20,  "200 chefs. 500 dishes.")


# ── Bookings — realistic spread ────────────────────────────────────────────────

print("🎟  Creating bookings…")

def wave(event, pairs):
    for user, n, days in pairs:
        book(user.id, event.id, event.ticket_price, n, days)

wave(coldplay, [
    (alice,3,25),(priya,2,24),(karthik,4,22),(rohan,2,20),(meera,3,18),(arjun,2,16),
    (divya,4,14),(sanjay,3,12),(alice,2,10),(priya,3,8),(karthik,2,6),(rohan,4,4),
    (meera,2,3),(arjun,3,2),(divya,2,1),(sanjay,4,1),(alice,3,1),(priya,2,1),
])
wave(nh7, [
    (alice,4,20),(priya,3,18),(karthik,2,16),(rohan,3,14),(meera,4,12),
    (arjun,2,10),(divya,3,8),(sanjay,4,6),(alice,2,4),(priya,4,2),(karthik,3,1),
])
wave(vir_das, [
    (alice,2,15),(priya,2,14),(karthik,2,12),(rohan,2,10),(meera,2,8),
    (arjun,2,6),(divya,2,4),(sanjay,2,2),(alice,1,1),(priya,1,1),(rohan,2,1),
])
wave(kanan, [(alice,2,10),(karthik,2,8),(meera,2,6),(divya,2,4),(priya,1,2),(arjun,1,1)])
wave(rcb_mi, [
    (karthik,4,8),(rohan,4,7),(arjun,4,6),(sanjay,4,5),(priya,2,4),(meera,2,3),
    (divya,2,2),(karthik,3,2),(rohan,3,1),(arjun,3,1),(sanjay,3,1),(alice,2,1),
    (priya,3,1),(meera,3,1),(karthik,2,1),(rohan,2,1),
])
wave(marathon, [(alice,1,28),(rohan,1,25),(arjun,1,22),(sanjay,1,18),(divya,1,15),(meera,1,12),(karthik,1,8),(priya,1,4)])
wave(kabaddi, [(karthik,3,18),(arjun,3,15),(sanjay,2,12),(rohan,2,10),(meera,2,7),(divya,2,4)])
wave(pycon,   [(alice,1,50),(priya,1,45),(karthik,1,40),(rohan,1,35),(meera,1,28),(arjun,1,20),(divya,1,14),(sanjay,1,7)])
wave(aiconf,  [(alice,2,35),(priya,2,30),(karthik,2,25),(rohan,2,20),(meera,2,15),(arjun,2,10),(divya,2,7),(sanjay,2,4),(alice,2,2),(rohan,2,1)])
wave(startup, [(alice,2,7),(priya,2,6),(karthik,2,5),(rohan,2,4),(arjun,2,3),(divya,2,1)])
wave(art_fair,[(alice,2,12),(meera,2,9),(divya,2,6),(priya,1,3)])
wave(food_f,  [(priya,2,18),(meera,2,15),(divya,2,12),(sanjay,2,9),(alice,2,6),(rohan,2,2)])

db.commit()

# Summary
total_b   = db.query(Booking).count()
total_s   = db.query(BookingSeat).count()
total_rev = sum(b.total_amount for b in db.query(Booking).filter(Booking.status == BookingStatus.confirmed).all())

print()
print("✅  Seed complete!")
print(f"    Users:      {db.query(User).count()}  ({db.query(User).filter(User.role==UserRole.organizer).count()} organizers)")
print(f"    Events:     {db.query(Event).count()}")
print(f"    Bookings:   {total_b}")
print(f"    Seats sold: {total_s}")
print(f"    Revenue:    ₹{total_rev:,.0f}")
print()
print("  Test accounts:")
print("  ─────────────────────────────────────────────────────")
print("  Role         Email                    Password")
print("  ─────────────────────────────────────────────────────")
print("  Admin        admin@eventhub.in         admin123")
print("  Organiser    raj@eventhub.in           password123")
print("  Organiser    sport@eventhub.in         password123")
print("  Organiser    tech@eventhub.in          password123")
print("  Participant  alice@example.in           password123")
print("  Participant  priya@example.in           password123")
print("  ─────────────────────────────────────────────────────")
db.close()
