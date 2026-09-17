"""
Data Quality and Governance Schemas
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict

class QuarantineRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    quarantine_id: uuid.UUID
    batch_identifier: Optional[str] = None
    source_stream: str
    raw_record: Dict[str, Any]
    rejection_reason: str
    rejected_at: datetime

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    pipeline_name: str
    batch_identifier: str
    start_time: datetime
    end_time: Optional[datetime] = None
    rows_extracted: int
    rows_loaded: int
    rows_rejected: int
    rows_deduplicated: int
    status: str
    error_message: Optional[str] = None
    execution_time_seconds: Optional[float] = None

class DataQualitySummaryResponse(BaseModel):
    warehouse_summary: Dict[str, Any]
    pipeline_health: Dict[str, Any]
    telemetry_metrics: Dict[str, Any]
    operational_governance: Dict[str, Any]
