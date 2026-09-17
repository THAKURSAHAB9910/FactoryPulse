"""
Incident Schemas for Incident Console & Workflow
"""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    incident_id: uuid.UUID
    alert_id: Optional[uuid.UUID] = None
    machine_id: str
    rule_name: str
    metric_name: str
    observed_value: float
    threshold_value: float
    severity: str
    status: str
    assigned_to: Optional[uuid.UUID] = None
    assignee_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_name: Optional[str] = None
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class IncidentAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

class IncidentAssignRequest(BaseModel):
    assigned_to: uuid.UUID

class IncidentInvestigateRequest(BaseModel):
    root_cause: str
    notes: Optional[str] = None

class IncidentResolveRequest(BaseModel):
    root_cause: str
    corrective_action: str
    resolution_notes: Optional[str] = None

class IncidentStats(BaseModel):
    total_open: int
    total_acknowledged: int
    total_investigating: int
    total_resolved: int
    critical_count: int
    warning_count: int
