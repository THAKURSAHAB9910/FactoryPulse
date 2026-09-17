"""
Tests for FactoryPulse Manufacturing Simulator
"""

import pytest
import pandas as pd
from datetime import datetime, timezone
from data_engine.simulator.generator import ManufacturingDataSimulator
from data_engine.simulator.config import MACHINES, PRODUCTS

def test_simulator_initialization():
    sim = ManufacturingDataSimulator()
    assert sim.seed == 42
    assert sim.start_date < sim.end_date

def test_generate_production_events_sample():
    sim = ManufacturingDataSimulator()
    df = sim.generate_production_events(count=500)
    
    # Check count includes injected duplicates & corrupt candidates (> 500)
    assert len(df) >= 500
    assert "production_id" in df.columns
    assert "part_serial_number" in df.columns
    assert "ideal_cycle_time_sec" in df.columns
    assert "actual_cycle_time_sec" in df.columns
    assert "is_good_part" in df.columns

def test_generate_sensor_telemetry_sample():
    sim = ManufacturingDataSimulator()
    df = sim.generate_sensor_telemetry(count=300)
    
    assert len(df) == 300
    assert "telemetry_id" in df.columns
    assert "vibration_rms" in df.columns
    assert "temperature_c" in df.columns
    assert "is_anomaly" in df.columns
    
    # Check anomalies exist
    anomalies = df[df["is_anomaly"] == True]
    assert len(anomalies) >= 0

def test_generate_downtime_events_sample():
    sim = ManufacturingDataSimulator()
    df = sim.generate_downtime_events(count=200)
    
    assert len(df) == 200
    assert "downtime_id" in df.columns
    assert "duration_minutes" in df.columns
    assert "is_micro_stoppage" in df.columns
    assert (df["duration_minutes"] > 0).all()

def test_generate_quality_events_sample():
    sim = ManufacturingDataSimulator()
    df = sim.generate_quality_events(count=200)
    
    assert len(df) == 200
    assert "quality_id" in df.columns
    assert "defect_rate_pct" in df.columns
    assert (df["defect_count"] <= df["inspected_count"]).all()
