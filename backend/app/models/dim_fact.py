"""
Dimension and Fact Table ORM Models
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Date, DateTime, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class DimFactory(Base):
    __tablename__ = "dim_factory"

    factory_id = Column(String(32), primary_key=True)
    factory_name = Column(String(128), nullable=False)
    country = Column(String(64), nullable=False)
    city = Column(String(64), nullable=False)
    timezone = Column(String(64), nullable=False)
    operating_since = Column(Date, nullable=False)
    floor_area_sqm = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

class DimProductionLine(Base):
    __tablename__ = "dim_production_line"

    line_id = Column(String(32), primary_key=True)
    factory_id = Column(String(32), ForeignKey("dim_factory.factory_id"), nullable=False)
    line_name = Column(String(128), nullable=False)
    line_type = Column(String(64), nullable=False)
    designed_capacity_uph = Column(Numeric(8, 2), nullable=False)
    is_active = Column(Boolean, default=True)

class DimMachine(Base):
    __tablename__ = "dim_machine"

    machine_id = Column(String(32), primary_key=True)
    line_id = Column(String(32), ForeignKey("dim_production_line.line_id"), nullable=False)
    machine_name = Column(String(128), nullable=False)
    machine_type = Column(String(64), nullable=False)
    model_number = Column(String(64), nullable=False)
    manufacturer = Column(String(64), nullable=False)
    installation_date = Column(Date, nullable=False)
    ideal_cycle_time_sec = Column(Numeric(8, 2), nullable=False)
    max_rated_power_kw = Column(Numeric(8, 2), nullable=False)
    is_bottleneck = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class FactAlert(Base):
    __tablename__ = "fact_alerts"

    alert_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("alert_rules.rule_id"), nullable=True)
    machine_id = Column(String(32), ForeignKey("dim_machine.machine_id"), nullable=False)
    shift_id = Column(String(32), nullable=False)
    date_key = Column(Integer, nullable=False)
    triggered_at = Column(DateTime(timezone=True), nullable=False)
    metric_name = Column(String(64), nullable=False)
    observed_value = Column(Numeric(12, 4), nullable=False)
    threshold_value = Column(Numeric(12, 4), nullable=False)
    severity = Column(String(32), nullable=False, default="WARNING")
    status = Column(String(32), nullable=False, default="OPEN")
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
