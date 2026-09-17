"""
ETL Audit Log & Quarantine Models
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from ..database import Base

class EtlAuditLog(Base):
    __tablename__ = "etl_audit_log"

    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_name = Column(String(64), nullable=False)
    batch_identifier = Column(String(64), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    rows_extracted = Column(Integer, nullable=False, default=0)
    rows_loaded = Column(Integer, nullable=False, default=0)
    rows_rejected = Column(Integer, nullable=False, default=0)
    rows_deduplicated = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False)
    error_message = Column(Text, nullable=True)
    execution_time_seconds = Column(Numeric(10, 3), nullable=True)

class QuarantineRecord(Base):
    __tablename__ = "quarantine_records"

    quarantine_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_identifier = Column(String(64), nullable=True)
    source_stream = Column(String(64), nullable=False)
    raw_record = Column(JSONB, nullable=False)
    rejection_reason = Column(String(256), nullable=False)
    rejected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
