"""
FactoryPulse PostgreSQL Star Schema Bulk Loader
Efficiently streams data into star schema fact tables, quarantine tables, and audit logs.
"""

import os
import io
import time
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger("ETL-Loader")

class WarehouseLoader:
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/factorypulse")
        self.engine = create_engine(self.db_url, pool_pre_ping=True, pool_size=10, max_overflow=20)

    def load_quarantine_records(self, quarantine_list: List[Dict[str, Any]]) -> int:
        if not quarantine_list:
            return 0
        df = pd.DataFrame(quarantine_list)
        df.to_sql("quarantine_records", self.engine, if_exists="append", index=False, method="multi", chunksize=1000)
        logger.info(f"Loaded {len(quarantine_list):,} records into quarantine_records.")
        return len(quarantine_list)

    def log_audit_entry(
        self,
        pipeline_name: str,
        batch_id: str,
        start_time: datetime,
        end_time: datetime,
        rows_extracted: int,
        rows_loaded: int,
        rows_rejected: int,
        rows_deduplicated: int,
        status: str,
        error_msg: str = None
    ):
        exec_sec = round((end_time - start_time).total_seconds(), 3)
        query = text("""
            INSERT INTO etl_audit_log (
                pipeline_name, batch_identifier, start_time, end_time,
                rows_extracted, rows_loaded, rows_rejected, rows_deduplicated,
                status, error_message, execution_time_seconds
            ) VALUES (
                :pipeline, :batch, :start_t, :end_t,
                :extracted, :loaded, :rejected, :deduped,
                :status, :error, :exec_time
            );
        """)
        with self.engine.begin() as conn:
            conn.execute(query, {
                "pipeline": pipeline_name,
                "batch": batch_id,
                "start_t": start_time,
                "end_t": end_time,
                "extracted": rows_extracted,
                "loaded": rows_loaded,
                "rejected": rows_rejected,
                "deduped": rows_deduplicated,
                "status": status,
                "error": error_msg,
                "exec_time": exec_sec
            })
        logger.info(f"Audit log updated: {pipeline_name} batch {batch_id} -> {status} ({rows_loaded:,} loaded in {exec_sec}s)")

    def bulk_load_production(self, df: pd.DataFrame, chunk_size: int = 25000) -> int:
        logger.info(f"Bulk loading {len(df):,} production facts...")
        # Write directly to fact_production
        df.to_sql("fact_production", self.engine, if_exists="append", index=False, method="multi", chunksize=chunk_size)
        return len(df)

    def bulk_load_sensors(self, df: pd.DataFrame, chunk_size: int = 25000) -> int:
        logger.info(f"Bulk loading {len(df):,} sensor telemetry facts...")
        df.to_sql("fact_sensor_telemetry", self.engine, if_exists="append", index=False, method="multi", chunksize=chunk_size)
        return len(df)

    def bulk_load_downtime(self, df: pd.DataFrame) -> int:
        logger.info(f"Bulk loading {len(df):,} downtime facts...")
        df.to_sql("fact_downtime", self.engine, if_exists="append", index=False, method="multi", chunksize=5000)
        return len(df)

    def bulk_load_quality(self, df: pd.DataFrame) -> int:
        logger.info(f"Bulk loading {len(df):,} quality facts...")
        df.to_sql("fact_quality", self.engine, if_exists="append", index=False, method="multi", chunksize=5000)
        return len(df)

    def refresh_materialized_views(self):
        logger.info("Refreshing manufacturing materialized views...")
        with self.engine.begin() as conn:
            conn.execute(text("REFRESH MATERIALIZED VIEW mv_daily_machine_oee;"))
            conn.execute(text("REFRESH MATERIALIZED VIEW mv_hourly_line_performance;"))
        logger.info("Materialized views refreshed successfully.")
