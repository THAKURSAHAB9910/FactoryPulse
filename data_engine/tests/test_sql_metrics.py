"""
Tests for Manufacturing SQL Metrics & Formula Implementations
Verifies mathematical accuracy of OEE, Availability, Performance, Quality, MTBF, and MTTR.
"""

import pytest

def calculate_oee(
    planned_production_minutes: float,
    downtime_minutes: float,
    ideal_cycle_time_sec: float,
    total_parts: int,
    good_parts: int
):
    operating_minutes = max(0.0, planned_production_minutes - downtime_minutes)
    
    # Availability
    availability = operating_minutes / planned_production_minutes if planned_production_minutes > 0 else 0.0
    
    # Performance
    operating_seconds = operating_minutes * 60.0
    ideal_operating_seconds = total_parts * ideal_cycle_time_sec
    performance = min(1.0, ideal_operating_seconds / operating_seconds) if operating_seconds > 0 else 0.0
    
    # Quality
    quality = good_parts / total_parts if total_parts > 0 else 0.0
    
    # OEE
    oee = availability * performance * quality
    
    return {
        "operating_minutes": operating_minutes,
        "availability": round(availability, 4),
        "performance": round(performance, 4),
        "quality": round(quality, 4),
        "oee": round(oee, 4)
    }

def calculate_mtbf_mttr(
    operating_hours: float,
    downtime_hours: float,
    breakdown_count: int
):
    if breakdown_count == 0:
        return {"mtbf_hours": None, "mttr_hours": 0.0, "inherent_availability": 1.0}
        
    mttr = downtime_hours / breakdown_count
    mtbf = operating_hours / breakdown_count
    inherent_avail = mtbf / (mtbf + mttr) if (mtbf + mttr) > 0 else 0.0
    
    return {
        "mtbf_hours": round(mtbf, 2),
        "mttr_hours": round(mttr, 2),
        "inherent_availability": round(inherent_avail, 4)
    }

def test_oee_world_class_benchmark():
    # World class standard: Availability >= 90%, Performance >= 95%, Quality >= 99.9% -> OEE >= 85%
    # Shift: 435 planned min (8h shift with 45m break), 30m downtime
    # Operating time: 405 min = 24,300 sec
    # Ideal cycle: 30 sec -> Max output in 405 min = 810 parts
    # Suppose produced 780 parts, 775 good parts
    res = calculate_oee(
        planned_production_minutes=435.0,
        downtime_minutes=30.0,
        ideal_cycle_time_sec=30.0,
        total_parts=780,
        good_parts=775
    )
    
    assert res["operating_minutes"] == 405.0
    assert res["availability"] == pytest.approx(405.0 / 435.0, abs=1e-3) # ~0.9310
    assert res["performance"] == pytest.approx((780 * 30.0) / (405 * 60.0), abs=1e-3) # ~0.9630
    assert res["quality"] == pytest.approx(775 / 780, abs=1e-3) # ~0.9936
    assert res["oee"] == pytest.approx(res["availability"] * res["performance"] * res["quality"], abs=1e-3)

def test_oee_zero_operating_time():
    # Complete machine breakdown for the full shift
    res = calculate_oee(
        planned_production_minutes=435.0,
        downtime_minutes=435.0,
        ideal_cycle_time_sec=30.0,
        total_parts=0,
        good_parts=0
    )
    assert res["availability"] == 0.0
    assert res["performance"] == 0.0
    assert res["quality"] == 0.0
    assert res["oee"] == 0.0

def test_mtbf_mttr_calculation():
    # 500 operating hours, 25 hours total repair downtime, 5 breakdowns
    res = calculate_mtbf_mttr(
        operating_hours=500.0,
        downtime_hours=25.0,
        breakdown_count=5
    )
    assert res["mtbf_hours"] == 100.0 # 500 / 5
    assert res["mttr_hours"] == 5.0    # 25 / 5
    assert res["inherent_availability"] == pytest.approx(100.0 / 105.0, abs=1e-3) # ~0.9524
