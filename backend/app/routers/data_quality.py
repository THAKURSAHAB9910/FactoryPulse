"""
Data Quality, Quarantine & Audit Logging Router
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db, engine
from ..models.audit import EtlAuditLog, QuarantineRecord
from ..schemas.data_quality import (
    DataQualitySummaryResponse,
    QuarantineRecordResponse,
    AuditLogResponse
)
from ..models.user import User
from ..utils.security import get_current_user
from data_engine.etl.quality_reporter import DataQualityReporter

router = APIRouter(prefix="/data-quality", tags=["Data Quality & Governance"])

@router.get("/summary", response_model=DataQualitySummaryResponse)
def get_data_quality_summary(
    current_user: User = Depends(get_current_user)
):
    reporter = DataQualityReporter(engine)
    return reporter.generate_report()

@router.get("/quarantine", response_model=List[QuarantineRecordResponse])
def list_quarantine_records(
    stream: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(QuarantineRecord)
    if stream:
        query = query.filter(QuarantineRecord.source_stream == stream)
    records = query.order_by(desc(QuarantineRecord.rejected_at)).limit(limit).all()
    return records

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(EtlAuditLog).order_by(desc(EtlAuditLog.start_time)).limit(limit).all()
    return logs
