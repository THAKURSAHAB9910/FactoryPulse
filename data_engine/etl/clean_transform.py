"""
FactoryPulse Data Cleaner & Transformer
Handles deduplication, type casting, date normalization, and derived column calculations.
"""

import logging
from typing import Tuple
import pandas as pd

logger = logging.getLogger("ETL-CleanTransform")

class DataCleanTransformer:
    def clean_production(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        """
        Deduplicates and transforms production events. Returns (cleaned_df, duplicate_count).
        """
        initial_len = len(df)
        # Deduplicate on part_serial_number
        cleaned_df = df.drop_duplicates(subset=["part_serial_number"], keep="first").copy()
        dup_count = initial_len - len(cleaned_df)
        
        # Ensure proper types
        cleaned_df["event_timestamp"] = pd.to_datetime(cleaned_df["event_timestamp"], utc=True)
        cleaned_df["date_key"] = cleaned_df["event_timestamp"].dt.strftime("%Y%m%d").astype(int)
        cleaned_df["ideal_cycle_time_sec"] = cleaned_df["ideal_cycle_time_sec"].astype(float).round(2)
        cleaned_df["actual_cycle_time_sec"] = cleaned_df["actual_cycle_time_sec"].astype(float).round(2)
        cleaned_df["is_good_part"] = cleaned_df["is_good_part"].astype(bool)
        cleaned_df["is_rework"] = cleaned_df["is_rework"].astype(bool)
        cleaned_df["is_scrap"] = cleaned_df["is_scrap"].astype(bool)
        cleaned_df["energy_kwh"] = cleaned_df["energy_kwh"].astype(float).round(4)
        
        logger.info(f"Cleaned production: {len(cleaned_df):,} rows, {dup_count:,} duplicates removed.")
        return cleaned_df, dup_count

    def clean_sensor_telemetry(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        initial_len = len(df)
        cleaned_df = df.drop_duplicates(subset=["machine_id", "recorded_at"], keep="first").copy()
        dup_count = initial_len - len(cleaned_df)
        
        cleaned_df["recorded_at"] = pd.to_datetime(cleaned_df["recorded_at"], utc=True)
        cleaned_df["date_key"] = cleaned_df["recorded_at"].dt.strftime("%Y%m%d").astype(int)
        cleaned_df["vibration_rms"] = cleaned_df["vibration_rms"].astype(float).round(3)
        cleaned_df["temperature_c"] = cleaned_df["temperature_c"].astype(float).round(2)
        cleaned_df["pressure_bar"] = cleaned_df["pressure_bar"].astype(float).round(2)
        cleaned_df["power_kw"] = cleaned_df["power_kw"].astype(float).round(2)
        cleaned_df["motor_rpm"] = cleaned_df["motor_rpm"].astype(float).round(1)
        cleaned_df["is_anomaly"] = cleaned_df["is_anomaly"].astype(bool)
        
        logger.info(f"Cleaned sensor telemetry: {len(cleaned_df):,} rows, {dup_count:,} duplicates removed.")
        return cleaned_df, dup_count

    def clean_downtime(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        initial_len = len(df)
        cleaned_df = df.drop_duplicates(subset=["machine_id", "start_time"], keep="first").copy()
        dup_count = initial_len - len(cleaned_df)
        
        cleaned_df["start_time"] = pd.to_datetime(cleaned_df["start_time"], utc=True)
        cleaned_df["end_time"] = pd.to_datetime(cleaned_df["end_time"], utc=True)
        cleaned_df["date_key"] = cleaned_df["start_time"].dt.strftime("%Y%m%d").astype(int)
        cleaned_df["duration_minutes"] = cleaned_df["duration_minutes"].astype(float).round(2)
        cleaned_df["is_micro_stoppage"] = cleaned_df["duration_minutes"] < 5.0
        
        logger.info(f"Cleaned downtime: {len(cleaned_df):,} rows, {dup_count:,} duplicates removed.")
        return cleaned_df, dup_count

    def clean_quality(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        initial_len = len(df)
        cleaned_df = df.drop_duplicates(subset=["machine_id", "product_id", "inspection_timestamp"], keep="first").copy()
        dup_count = initial_len - len(cleaned_df)
        
        cleaned_df["inspection_timestamp"] = pd.to_datetime(cleaned_df["inspection_timestamp"], utc=True)
        cleaned_df["date_key"] = cleaned_df["inspection_timestamp"].dt.strftime("%Y%m%d").astype(int)
        cleaned_df["inspected_count"] = cleaned_df["inspected_count"].astype(int)
        cleaned_df["defect_count"] = cleaned_df["defect_count"].astype(int)
        cleaned_df["scrap_count"] = cleaned_df["scrap_count"].astype(int)
        cleaned_df["rework_count"] = cleaned_df["rework_count"].astype(int)
        cleaned_df["defect_rate_pct"] = (cleaned_df["defect_count"] / cleaned_df["inspected_count"] * 100).round(3)
        cleaned_df["scrap_cost_usd"] = cleaned_df["scrap_cost_usd"].astype(float).round(2)
        
        logger.info(f"Cleaned quality: {len(cleaned_df):,} rows, {dup_count:,} duplicates removed.")
        return cleaned_df, dup_count
