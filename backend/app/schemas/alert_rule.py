"""
Alert Rule Schemas
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AlertRuleBase(BaseModel):
    rule_name: str
    metric_name: str
    comparison_operator: str
    threshold_value: float
    severity: str
    machine_type: Optional[str] = None
    is_active: bool = True
    description: Optional[str] = None

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    metric_name: Optional[str] = None
    comparison_operator: Optional[str] = None
    threshold_value: Optional[float] = None
    severity: Optional[str] = None
    machine_type: Optional[str] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None

class AlertRuleResponse(AlertRuleBase):
    model_config = ConfigDict(from_attributes=True)

    rule_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
