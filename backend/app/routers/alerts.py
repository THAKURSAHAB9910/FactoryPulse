"""
Alerts Router
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db, engine
from ..models.dim_fact import FactAlert
from ..models.user import User
from ..utils.security import get_current_user
from data_engine.etl.alert_evaluator import AlertEvaluator

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(
    limit: int = Query(50, le=200),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FactAlert)
    if severity and severity != "ALL":
        query = query.filter(FactAlert.severity == severity.upper())
    alerts = query.order_by(desc(FactAlert.triggered_at)).limit(limit).all()
    return alerts

@router.post("/evaluate")
def trigger_alert_evaluation(
    current_user: User = Depends(get_current_user)
):
    """
    Manually triggers the rule evaluation engine over fresh facts.
    """
    evaluator = AlertEvaluator(engine)
    new_incidents = evaluator.evaluate_and_generate_incidents()
    return {
        "status": "COMPLETED",
        "incidents_created": new_incidents,
        "message": f"Evaluated rules and opened {new_incidents} incidents."
    }
