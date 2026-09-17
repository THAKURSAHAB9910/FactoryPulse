"""
Unit Tests for KPI Schemas and Data Aggregations
"""

import pytest
from backend.app.schemas.kpi import OverallKpiSummary, ReliabilityKpi

def test_overall_kpi_summary_schema():
    data = {
        "oee": 0.8124,
        "availability": 0.9150,
        "performance": 0.9320,
        "quality": 0.9910,
        "total_production": 450200,
        "good_units": 446150,
        "scrap_units": 4050,
        "rejection_rate_pct": 0.90,
        "total_downtime_minutes": 12450.5,
        "active_machines_count": 12,
        "open_incidents_count": 5
    }
    summary = OverallKpiSummary(**data)
    assert summary.oee == 0.8124
    assert summary.total_production == 450200
    assert summary.active_machines_count == 12

def test_reliability_kpi_schema():
    data = {
        "machine_id": "MCH-01-01",
        "machine_name": "Schuler Servo Press 2500T",
        "line_name": "Press & Stamping Line A",
        "total_breakdowns": 8,
        "total_repair_hours": 14.5,
        "mttr_hours": 1.81,
        "mtbf_hours": 78.4,
        "inherent_availability_pct": 97.74,
        "reliability_rank": 3
    }
    kpi = ReliabilityKpi(**data)
    assert kpi.machine_id == "MCH-01-01"
    assert kpi.mtbf_hours == 78.4
    assert kpi.reliability_rank == 3
