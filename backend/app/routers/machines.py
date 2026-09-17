"""
Machines & Fleet Status Router
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models.dim_fact import DimMachine, DimProductionLine, DimFactory
from ..utils.security import get_current_user
from ..models.user import User

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("")
def list_machines(
    factory_id: Optional[str] = None,
    line_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full machine fleet with live calculated status and latest sensor telemetry.
    """
    sql = """
        SELECT
            m.machine_id,
            m.machine_name,
            m.machine_type,
            m.ideal_cycle_time_sec,
            m.is_bottleneck,
            pl.line_id,
            pl.line_name,
            f.factory_id,
            f.factory_name,
            -- Latest telemetry
            COALESCE(tel.vibration_rms, 1.5) AS current_vibration_rms,
            COALESCE(tel.temperature_c, 55.0) AS current_temperature_c,
            COALESCE(tel.pressure_bar, 120.0) AS current_pressure_bar,
            COALESCE(tel.is_anomaly, FALSE) AS has_anomaly,
            -- Live status derived from active incidents
            CASE
                WHEN inc.incident_count > 0 THEN 'DOWNTIME'
                WHEN tel.is_anomaly THEN 'WARNING'
                ELSE 'RUNNING'
            END AS machine_status
        FROM dim_machine m
        JOIN dim_production_line pl ON m.line_id = pl.line_id
        JOIN dim_factory f ON pl.factory_id = f.factory_id
        LEFT JOIN LATERAL (
            SELECT vibration_rms, temperature_c, pressure_bar, is_anomaly
            FROM fact_sensor_telemetry t
            WHERE t.machine_id = m.machine_id
            ORDER BY recorded_at DESC
            LIMIT 1
        ) tel ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS incident_count
            FROM incidents i
            WHERE i.machine_id = m.machine_id AND i.status IN ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING')
        ) inc ON TRUE
        WHERE (:fact_id IS NULL OR f.factory_id = :fact_id)
          AND (:ln_id IS NULL OR pl.line_id = :ln_id)
        ORDER BY m.machine_id;
    """
    results = db.execute(text(sql), {"fact_id": factory_id, "ln_id": line_id}).mappings().all()
    return list(results)

@router.get("/{machine_id}/telemetry")
def get_machine_telemetry(
    machine_id: str,
    limit: int = Query(60, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns recent sensor telemetry time-series for charting."""
    sql = """
        SELECT
            recorded_at,
            vibration_rms,
            temperature_c,
            pressure_bar,
            power_kw,
            motor_rpm,
            is_anomaly
        FROM fact_sensor_telemetry
        WHERE machine_id = :mch_id
        ORDER BY recorded_at DESC
        LIMIT :lim;
    """
    rows = db.execute(text(sql), {"mch_id": machine_id, "lim": limit}).mappings().all()
    return list(reversed(rows))
