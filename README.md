# EventHub — Full-Stack Event Management Platform

A production-grade event management platform 

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 + SQLAlchemy ORM |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Real-time | WebSockets (FastAPI native) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| HTTP Client | Axios |

---

## Project Structure

```
event-platform/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Pydantic settings (.env)
│   ├── database.py              # SQLAlchemy engine + session
│   ├── models.py                # ORM models (all tables)
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── auth.py                  # JWT utils + dependency injectors
│   ├── seed.py                  # Dev data seeder
│   ├── routers/
│   │   ├── auth.py              # POST /register, /login, /me
│   │   ├── events.py            # CRUD + seat map generation
│   │   ├── bookings.py          # Solo ticket booking
│   └── services/
│       ├── seat_clustering.py   # Algorithmic consecutive-seat finder
│       └── websocket_manager.py # Per-room WS broadcast manager
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx               # Event discovery + search
        │   ├── EventDetail.jsx        # Event info + booking CTAs
        │   ├── BookTicket.jsx         # Solo booking / group room creation
        │   ├── MyBookings.jsx         # User's ticket history
        │   ├── CreateEvent.jsx        # Organizer event form
        │   └── OrganizerDashboard.jsx # Stats + event management
        ├── components/
        │   ├── Navbar.jsx
        │   ├── EventCard.jsx
        │   ├── SeatMap.jsx            # Interactive seat grid
        │   └── Toast.jsx
        ├── api/client.js              # Axios instance + all API calls
        └── store/useStore.js          # Zustand: auth + UI state
```

---

## Data Model

```
User ──< Event (organizer creates many events)
Event ──< Seat (auto-generated on event creation)
User ──< Booking ──< BookingSeat >── Seat
```

---

## Quick Start

### Option A: Docker Compose (recommended)

```bash
# Start everything (PostgreSQL + backend + frontend)
docker-compose up --build

# In a new terminal, seed sample data
docker exec eventhub_backend python seed.py
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

### Option B: Local Dev

**Prerequisites:** Python 3.12+, Node 20+, PostgreSQL running locally.

#### 1. Database

```bash
createdb eventdb
# or: psql -U postgres -c "CREATE DATABASE eventdb;"
```

#### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit env
cp .env.example .env              # adjust DATABASE_URL if needed

# Start API server
uvicorn main:app --reload         # http://localhost:8000

# Seed sample data (optional, separate terminal)
python seed.py
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

---

## Key API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (participant or organizer) |
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Current user |

### Events
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | List events (search, category filter) |
| POST | `/api/events` | Create event + auto-generate seats (organizer) |
| GET | `/api/events/{id}` | Event detail |
| GET | `/api/events/{id}/seats` | Full seat map grouped by row |

### Bookings (solo)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bookings` | Book selected seats |
| GET | `/api/bookings` | My bookings |
| DELETE | `/api/bookings/{id}` | Cancel booking |

---

## Test Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@eventhub.in | admin123 |
| Organizer | sports@eventhub.in | password123 |
| Organizer | raj@eventhub.in | password123 |
| Participant | alice@example.in | password123 |
| Participant | priya@example.in | password123 |
| Participant | karthik@example.in | password123 |

---

## Interactive API Docs

FastAPI auto-generates docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/eventdb
SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```
