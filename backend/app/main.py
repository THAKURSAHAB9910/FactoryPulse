"""
FactoryPulse — Manufacturing OEE & Downtime Intelligence Platform
FastAPI Backend Application Entrypoint
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .database import engine, Base, SessionLocal
from .models.user import User, UserRole
from .utils.security import get_password_hash
from .routers import (
    auth_router,
    machines_router,
    kpis_router,
    alerts_router,
    incidents_router,
    rules_router,
    data_quality_router,
    websocket_router
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("FactoryPulseAPI")

def seed_default_users():
    """Ensures standard roles exist for login & testing."""
    db = SessionLocal()
    try:
        users = [
            ("admin", "admin@factorypulse.io", "admin123", "System Administrator", UserRole.ADMIN),
            ("engineer", "engineer@factorypulse.io", "engineer123", "Reliability Engineer", UserRole.ENGINEER),
            ("supervisor", "supervisor@factorypulse.io", "supervisor123", "Shift Supervisor", UserRole.SUPERVISOR),
            ("operator", "operator@factorypulse.io", "operator123", "Line Operator", UserRole.OPERATOR),
        ]
        for username, email, pwd, name, role in users:
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                u = User(
                    username=username,
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    full_name=name,
                    role=role
                )
                db.add(u)
        db.commit()
        logger.info("Default operational users verified/seeded.")
    except Exception as e:
        logger.warning(f"Note on seeding users: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FactoryPulse Intelligence API...")
    try:
        # Create tables if not existing
        Base.metadata.create_all(bind=engine)
        seed_default_users()
    except Exception as e:
        logger.error(f"Error during startup migration/seeding: {e}")
    yield
    logger.info("Shutting down FactoryPulse API...")

app = FastAPI(
    title="FactoryPulse — Manufacturing Intelligence Platform",
    description="High-performance Decision Intelligence & Incident Resolution Platform for OEE, Downtime, and Telemetry.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(machines_router, prefix=settings.API_V1_PREFIX)
app.include_router(kpis_router, prefix=settings.API_V1_PREFIX)
app.include_router(alerts_router, prefix=settings.API_V1_PREFIX)
app.include_router(incidents_router, prefix=settings.API_V1_PREFIX)
app.include_router(rules_router, prefix=settings.API_V1_PREFIX)
app.include_router(data_quality_router, prefix=settings.API_V1_PREFIX)
app.include_router(websocket_router)

@app.get("/")
def root():
    return {
        "platform": settings.APP_NAME,
        "status": "OPERATIONAL",
        "docs": "/docs",
        "api_version": "v1"
    }

@app.get("/health")
def health_check():
    # Ping database
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
            db_ok = True
    except Exception:
        db_ok = False
        
    return {
        "status": "UP" if db_ok else "DEGRADED",
        "database_connected": db_ok
    }
