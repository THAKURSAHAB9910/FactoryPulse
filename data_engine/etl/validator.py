"""
FactoryPulse Data Quality Validator
Validates records against schema rules, domain constraints, and reference keys.
Routes corrupted records to quarantine.
"""

import json
import logging
from typing import Dict, List, Tuple, Any
import pandas as pd

from ..simulator.config import MACHINES, PRODUCTS, SHIFTS

from datetime import datetime

logger = logging.getLogger("ETL-Validator")

VALID_MACHINE_IDS = {m["machine_id"] for m in MACHINES}
VALID_PRODUCT_IDS = {p["product_id"] for p in PRODUCTS}
VALID_SHIFT_IDS = {s["shift_id"] for s in SHIFTS}

class DataValidator:
    def validate_production(self, df: pd.DataFrame, batch_id: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Validates production events. Returns (valid_df, quarantined_records).
        """
        valid_mask = pd.Series(True, index=df.index)
        quarantined = []
        
        for idx, row in df.iterrows():
            reason = None
            
            # Check timestamp validity
            ts_val = row["event_timestamp"]
            if not isinstance(ts_val, (datetime, pd.Timestamp, str)) or str(ts_val).startswith("INVALID"):
                reason = "INVALID_TIMESTAMP_FORMAT"
            elif row["ideal_cycle_time_sec"] <= 0:
                reason = "INVALID_IDEAL_CYCLE_TIME: Must be > 0"
            elif row["actual_cycle_time_sec"] <= 0:
                reason = "INVALID_ACTUAL_CYCLE_TIME: Must be > 0"
            elif row["machine_id"] not in VALID_MACHINE_IDS:
                reason = f"UNKNOWN_MACHINE_ID: '{row['machine_id']}' not in dimension"
            elif row["product_id"] not in VALID_PRODUCT_IDS:
                reason = f"UNKNOWN_PRODUCT_ID: '{row['product_id']}' not in dimension"
            elif row["shift_id"] not in VALID_SHIFT_IDS:
                reason = f"UNKNOWN_SHIFT_ID: '{row['shift_id']}' not in dimension"
                
            if reason:
                valid_mask[idx] = False
                quarantined.append({
                    "batch_identifier": batch_id,
                    "source_stream": "production",
                    "raw_record": json.dumps(row.to_dict(), default=str),
                    "rejection_reason": reason
                })
                
        valid_df = df[valid_mask].copy()
        logger.info(f"Production validation: {len(valid_df):,} valid, {len(quarantined):,} quarantined.")
        return valid_df, quarantined

    def validate_sensor_telemetry(self, df: pd.DataFrame, batch_id: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        valid_mask = pd.Series(True, index=df.index)
        quarantined = []
        
        for idx, row in df.iterrows():
            reason = None
            if row["vibration_rms"] < 0 or row["vibration_rms"] > 50.0:
                reason = "OUT_OF_BOUNDS_VIBRATION: Must be 0-50 mm/s"
            elif row["temperature_c"] < -20.0 or row["temperature_c"] > 250.0:
                reason = "OUT_OF_BOUNDS_TEMPERATURE: Must be -20 to 250 C"
            elif row["machine_id"] not in VALID_MACHINE_IDS:
                reason = f"UNKNOWN_MACHINE_ID: '{row['machine_id']}'"
                
            if reason:
                valid_mask[idx] = False
                quarantined.append({
                    "batch_identifier": batch_id,
                    "source_stream": "sensor_telemetry",
                    "raw_record": json.dumps(row.to_dict(), default=str),
                    "rejection_reason": reason
                })
                
        valid_df = df[valid_mask].copy()
        logger.info(f"Sensor validation: {len(valid_df):,} valid, {len(quarantined):,} quarantined.")
        return valid_df, quarantined

    def validate_downtime(self, df: pd.DataFrame, batch_id: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        valid_mask = pd.Series(True, index=df.index)
        quarantined = []
        
        for idx, row in df.iterrows():
            reason = None
            if row["duration_minutes"] <= 0:
                reason = "INVALID_DURATION: Must be > 0 min"
            elif row["machine_id"] not in VALID_MACHINE_IDS:
                reason = f"UNKNOWN_MACHINE_ID: '{row['machine_id']}'"
                
            if reason:
                valid_mask[idx] = False
                quarantined.append({
                    "batch_identifier": batch_id,
                    "source_stream": "downtime",
                    "raw_record": json.dumps(row.to_dict(), default=str),
                    "rejection_reason": reason
                })
                
        valid_df = df[valid_mask].copy()
        logger.info(f"Downtime validation: {len(valid_df):,} valid, {len(quarantined):,} quarantined.")
        return valid_df, quarantined

    def validate_quality(self, df: pd.DataFrame, batch_id: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        valid_mask = pd.Series(True, index=df.index)
        quarantined = []
        
        for idx, row in df.iterrows():
            reason = None
            if row["inspected_count"] <= 0:
                reason = "INVALID_INSPECTED_COUNT: Must be > 0"
            elif row["defect_count"] > row["inspected_count"]:
                reason = "LOGIC_ERROR: defect_count > inspected_count"
                
            if reason:
                valid_mask[idx] = False
                quarantined.append({
                    "batch_identifier": batch_id,
                    "source_stream": "quality",
                    "raw_record": json.dumps(row.to_dict(), default=str),
                    "rejection_reason": reason
                })
                
        valid_df = df[valid_mask].copy()
        logger.info(f"Quality validation: {len(valid_df):,} valid, {len(quarantined):,} quarantined.")
        return valid_df, quarantined
