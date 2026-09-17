"""
Tests for FactoryPulse ETL Pipeline: Validation, Cleaning, Quarantine & Dedup
"""

import pytest
import pandas as pd
from datetime import datetime, timezone
from data_engine.etl.validator import DataValidator
from data_engine.etl.clean_transform import DataCleanTransformer

def test_validator_quarantine_corrupt_records():
    validator = DataValidator()
    
    # Create sample dataframe with 2 valid and 2 corrupt rows
    df = pd.DataFrame([
        {
            "production_id": "p-01",
            "event_timestamp": datetime.now(timezone.utc),
            "date_key": 20260901,
            "factory_id": "FACT-01",
            "line_id": "LINE-01-A",
            "machine_id": "MCH-01-01",
            "product_id": "PROD-001",
            "shift_id": "SHIFT-M",
            "batch_id": "BATCH-01",
            "part_serial_number": "SN-001",
            "ideal_cycle_time_sec": 30.0,
            "actual_cycle_time_sec": 32.5,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.2
        },
        {
            "production_id": "p-02",
            "event_timestamp": "INVALID_TIMESTAMP",
            "date_key": 99999999,
            "factory_id": "UNKNOWN",
            "line_id": "UNKNOWN",
            "machine_id": "MCH-01-01",
            "product_id": "PROD-001",
            "shift_id": "SHIFT-M",
            "batch_id": "BATCH-02",
            "part_serial_number": "SN-002",
            "ideal_cycle_time_sec": 30.0,
            "actual_cycle_time_sec": 32.5,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.2
        },
        {
            "production_id": "p-03",
            "event_timestamp": datetime.now(timezone.utc),
            "date_key": 20260901,
            "factory_id": "FACT-01",
            "line_id": "LINE-01-A",
            "machine_id": "MCH-01-01",
            "product_id": "PROD-001",
            "shift_id": "SHIFT-M",
            "batch_id": "BATCH-03",
            "part_serial_number": "SN-003",
            "ideal_cycle_time_sec": -10.0, # Negative cycle time is invalid
            "actual_cycle_time_sec": 30.0,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.2
        }
    ])
    
    valid_df, quarantined = validator.validate_production(df, batch_id="TEST-BATCH")
    
    assert len(valid_df) == 1
    assert len(quarantined) == 2
    assert "INVALID_TIMESTAMP" in quarantined[0]["rejection_reason"]
    assert "INVALID_IDEAL_CYCLE_TIME" in quarantined[1]["rejection_reason"]

def test_cleaner_deduplication():
    cleaner = DataCleanTransformer()
    now = datetime.now(timezone.utc)
    
    # Dataframe with duplicate serial numbers
    df = pd.DataFrame([
        {
            "production_id": "p-01",
            "event_timestamp": now,
            "part_serial_number": "SN-DUPLICATE-01",
            "ideal_cycle_time_sec": 30.0,
            "actual_cycle_time_sec": 32.0,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.5
        },
        {
            "production_id": "p-02",
            "event_timestamp": now,
            "part_serial_number": "SN-DUPLICATE-01", # Duplicate!
            "ideal_cycle_time_sec": 30.0,
            "actual_cycle_time_sec": 32.0,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.5
        },
        {
            "production_id": "p-03",
            "event_timestamp": now,
            "part_serial_number": "SN-UNIQUE-02",
            "ideal_cycle_time_sec": 30.0,
            "actual_cycle_time_sec": 31.0,
            "is_good_part": True,
            "is_rework": False,
            "is_scrap": False,
            "energy_kwh": 1.4
        }
    ])
    
    cleaned_df, dup_count = cleaner.clean_production(df)
    
    assert len(cleaned_df) == 2
    assert dup_count == 1
    assert "date_key" in cleaned_df.columns
