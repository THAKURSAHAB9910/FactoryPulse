"""
Alert Rules Model
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class AlertRule(Base):
    __tablename__ = "alert_rules"

    rule_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_name = Column(String(128), nullable=False)
    metric_name = Column(String(64), nullable=False)
    comparison_operator = Column(String(8), nullable=False)
    threshold_value = Column(Numeric(12, 4), nullable=False)
    severity = Column(String(32), nullable=False, default="WARNING")
    machine_type = Column(String(64), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
