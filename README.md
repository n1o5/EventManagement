# EventHub — Full-Stack Event Management Platform

## Features

### User Features
- Secure authentication and role-based access
- Browse and search events
- View event details and reviews
- Book tickets with seat selection
- Secure online payments
- Access booking history

### Organizer Features
- Create, update, and manage events
- Track registrations and attendees
- Manage event listings through a dedicated dashboard

### Admin Features
- Manage users, organizers, and events
- Moderate platform content
- Monitor overall platform activity

### Booking & Payments
- Interactive seat selection
- Real-time seat availability
- Razorpay payment integration

### Additional Features
- Personalized event recommendations
- Review and rating system
- Real-time updates using WebSockets
- Email service integration
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
