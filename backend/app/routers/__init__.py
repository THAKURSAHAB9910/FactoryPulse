"""FastAPI Routers"""
from .auth import router as auth_router
from .machines import router as machines_router
from .kpis import router as kpis_router
from .alerts import router as alerts_router
from .incidents import router as incidents_router
from .rules import router as rules_router
from .data_quality import router as data_quality_router
from .websocket import router as websocket_router

__all__ = [
    "auth_router",
    "machines_router",
    "kpis_router",
    "alerts_router",
    "incidents_router",
    "rules_router",
    "data_quality_router",
    "websocket_router"
]
