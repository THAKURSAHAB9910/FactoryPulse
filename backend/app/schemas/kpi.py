"""
Manufacturing KPI Schemas
"""

from typing import List, Optional
from pydantic import BaseModel

class OverallKpiSummary(BaseModel):
    oee: float
    availability: float
    performance: float
    quality: float
    total_production: int
    good_units: int
    scrap_units: int
    rejection_rate_pct: float
    total_downtime_minutes: float
    active_machines_count: int
    open_incidents_count: int

class MachineOeeDetail(BaseModel):
    machine_id: str
    machine_name: str
    factory_id: str
    line_id: str
    availability_rate: float
    performance_rate: float
    quality_rate: float
    oee: float
    total_units: int
    operating_minutes: float
    downtime_minutes: float
    current_status: str # RUNNING, IDLE, DOWNTIME

class ReliabilityKpi(BaseModel):
    machine_id: str
    machine_name: str
    line_name: str
    total_breakdowns: int
    total_repair_hours: float
    mttr_hours: float
    mtbf_hours: float
    inherent_availability_pct: float
    reliability_rank: int

class ParetoDowntimeItem(BaseModel):
    reason_id: str
    reason_name: str
    category: str
    stoppage_type: str
    event_count: int
    total_lost_minutes: float
    pct_of_total_downtime: float
    pareto_cumulative_pct: float
    pareto_rank: int
