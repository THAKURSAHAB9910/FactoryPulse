"""
Incident Management & Resolution Workflow Router
Supports View, Filter, Acknowledge, Assign, Investigate, and Resolve actions with persistence & WS broadcast.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models.incident import Incident, IncidentStatus, AlertSeverity
from ..models.user import User
from ..schemas.incident import (
    IncidentResponse,
    IncidentAcknowledgeRequest,
    IncidentAssignRequest,
    IncidentInvestigateRequest,
    IncidentResolveRequest,
    IncidentStats
)
from ..utils.security import get_current_user
from .websocket import manager

logger = logging.getLogger("IncidentsRouter")
router = APIRouter(prefix="/incidents", tags=["Incidents"])

def _format_incident_response(inc: Incident, db: Session) -> IncidentResponse:
    assignee_name = inc.assignee.full_name if inc.assignee else None
    ack_name = inc.acknowledger.full_name if inc.acknowledger else None
    res_name = inc.resolver.full_name if inc.resolver else None
    
    return IncidentResponse(
        incident_id=inc.incident_id,
        alert_id=inc.alert_id,
        machine_id=inc.machine_id,
        rule_name=inc.rule_name,
        metric_name=inc.metric_name,
        observed_value=float(inc.observed_value),
        threshold_value=float(inc.threshold_value),
        severity=inc.severity,
        status=inc.status,
        assigned_to=inc.assigned_to,
        assignee_name=assignee_name,
        acknowledged_at=inc.acknowledged_at,
        acknowledged_by_name=ack_name,
        root_cause=inc.root_cause,
        corrective_action=inc.corrective_action,
        resolved_at=inc.resolved_at,
        resolved_by_name=res_name,
        resolution_notes=inc.resolution_notes,
        created_at=inc.created_at,
        updated_at=inc.updated_at
    )

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    machine_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List incidents with multi-field filtering and pagination.
    """
    query = db.query(Incident)
    if status and status != "ALL":
        query = query.filter(Incident.status == status.upper())
    if severity and severity != "ALL":
        query = query.filter(Incident.severity == severity.upper())
    if machine_id:
        query = query.filter(Incident.machine_id == machine_id)
        
    incidents = query.order_by(desc(Incident.created_at)).offset(skip).limit(limit).all()
    return [_format_incident_response(inc, db) for inc in incidents]

@router.get("/stats", response_model=IncidentStats)
def get_incident_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns quick counts by status and severity for console summary badges."""
    open_c = db.query(Incident).filter(Incident.status == IncidentStatus.OPEN).count()
    ack_c = db.query(Incident).filter(Incident.status == IncidentStatus.ACKNOWLEDGED).count()
    inv_c = db.query(Incident).filter(Incident.status == IncidentStatus.INVESTIGATING).count()
    res_c = db.query(Incident).filter(Incident.status == IncidentStatus.RESOLVED).count()
    
    crit_c = db.query(Incident).filter(
        Incident.severity == AlertSeverity.CRITICAL,
        Incident.status != IncidentStatus.RESOLVED
    ).count()
    
    warn_c = db.query(Incident).filter(
        Incident.severity == AlertSeverity.WARNING,
        Incident.status != IncidentStatus.RESOLVED
    ).count()

    return IncidentStats(
        total_open=open_c,
        total_acknowledged=ack_c,
        total_investigating=inv_c,
        total_resolved=res_c,
        critical_count=crit_c,
        warning_count=warn_c
    )

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_detail(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return _format_incident_response(inc, db)

@router.post("/{incident_id}/acknowledge", response_model=IncidentResponse)
async def acknowledge_incident(
    incident_id: uuid.UUID,
    req: IncidentAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
    inc.status = IncidentStatus.ACKNOWLEDGED
    inc.acknowledged_at = datetime.now(timezone.utc)
    inc.acknowledged_by = current_user.user_id
    if req.notes:
        inc.resolution_notes = f"[ACK NOTE] {req.notes}\n" + (inc.resolution_notes or "")
        
    db.commit()
    db.refresh(inc)
    
    # Broadcast state change via WebSocket
    await manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "action": "ACKNOWLEDGE",
        "incident_id": str(inc.incident_id),
        "status": inc.status,
        "machine_id": inc.machine_id,
        "user": current_user.full_name
    })
    
    return _format_incident_response(inc, db)

@router.post("/{incident_id}/assign", response_model=IncidentResponse)
async def assign_incident(
    incident_id: uuid.UUID,
    req: IncidentAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
    target_user = db.query(User).filter(User.user_id == req.assigned_to).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee user does not exist")
        
    inc.assigned_to = target_user.user_id
    db.commit()
    db.refresh(inc)
    
    await manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "action": "ASSIGN",
        "incident_id": str(inc.incident_id),
        "assigned_to": target_user.full_name,
        "machine_id": inc.machine_id
    })
    
    return _format_incident_response(inc, db)

@router.post("/{incident_id}/investigate", response_model=IncidentResponse)
async def investigate_incident(
    incident_id: uuid.UUID,
    req: IncidentInvestigateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
    inc.status = IncidentStatus.INVESTIGATING
    inc.root_cause = req.root_cause
    if req.notes:
        inc.resolution_notes = f"[INVESTIGATION NOTE] {req.notes}\n" + (inc.resolution_notes or "")
        
    db.commit()
    db.refresh(inc)
    
    await manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "action": "INVESTIGATING",
        "incident_id": str(inc.incident_id),
        "status": inc.status,
        "machine_id": inc.machine_id
    })
    
    return _format_incident_response(inc, db)

@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: uuid.UUID,
    req: IncidentResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
    inc.status = IncidentStatus.RESOLVED
    inc.root_cause = req.root_cause
    inc.corrective_action = req.corrective_action
    inc.resolved_at = datetime.now(timezone.utc)
    inc.resolved_by = current_user.user_id
    if req.resolution_notes:
        inc.resolution_notes = f"[RESOLUTION NOTE] {req.resolution_notes}\n" + (inc.resolution_notes or "")
        
    db.commit()
    db.refresh(inc)
    
    await manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "action": "RESOLVE",
        "incident_id": str(inc.incident_id),
        "status": inc.status,
        "machine_id": inc.machine_id,
        "resolver": current_user.full_name
    })
    
    return _format_incident_response(inc, db)
