from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, events, bookings, organizer, admin, recommendations

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EventHub API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(organizer.router)
app.include_router(admin.router)
app.include_router(recommendations.router)

@app.get("/")
def health():
    return {"status": "ok", "service": "EventHub API v4"}
