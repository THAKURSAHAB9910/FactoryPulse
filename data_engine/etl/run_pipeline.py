"""
FactoryPulse Master Pipeline Orchestrator
Coordinates Simulation -> Validation -> Cleansing -> Loading -> Alerting -> Data Quality Reporting.
Ensures >500,000 events are ingested and materialized views are refreshed.
"""

import os
import sys
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text

from ..simulator.generator import ManufacturingDataSimulator
from .validator import DataValidator
from .clean_transform import DataCleanTransformer
from .loader import WarehouseLoader
from .alert_evaluator import AlertEvaluator
from .quality_reporter import DataQualityReporter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ETL-MasterPipeline")

def apply_sql_scripts(engine):
    """Executes SQL DDL scripts to initialize schema if needed."""
    sql_dir = Path(__file__).resolve().parent.parent / "sql"
    scripts = [
        "01_init_schema.sql",
        "02_create_dimensions.sql",
        "03_create_facts_partitioned.sql",
        "04_create_indexes_views.sql"
    ]
    logger.info("Verifying and applying database DDL scripts...")
    for script_name in scripts:
        script_path = sql_dir / script_name
        if script_path.exists():
            logger.info(f"Executing SQL file: {script_name}")
            with open(script_path, "r", encoding="utf-8") as f:
                content = f.read()
            # Split statements or run block
            with engine.begin() as conn:
                conn.execute(text(content))
        else:
            logger.warning(f"SQL file {script_name} not found at {script_path}")

def run_pipeline(target_total_events: int = 510000, db_url: str = None):
    start_all = datetime.now(timezone.utc)
    batch_id = f"BATCH-{start_all.strftime('%Y%m%d%H%M%S')}"
    logger.info(f"=== Starting FactoryPulse Data Engineering Pipeline [Batch: {batch_id}] ===")
    
    loader = WarehouseLoader(db_url)
    engine = loader.engine
    
    # 1. Ensure Schema Exists
    apply_sql_scripts(engine)
    
    # 2. Run Simulator to generate >= 500k events
    # Distribution: ~300k production, 160k sensor, 15k downtime, 35k quality = 510k events
    simulator = ManufacturingDataSimulator()
    raw_data = simulator.generate_all(
        target_production=300000,
        target_sensors=160000,
        target_downtime=15000,
        target_quality=35000
    )
    
    validator = DataValidator()
    cleaner = DataCleanTransformer()
    
    total_quarantined = []
    
    # 3. Process Production Stream
    p_start = datetime.now(timezone.utc)
    prod_extracted = len(raw_data["production"])
    valid_prod, quar_prod = validator.validate_production(raw_data["production"], batch_id)
    total_quarantined.extend(quar_prod)
    clean_prod, prod_dups = cleaner.clean_production(valid_prod)
    prod_loaded = loader.bulk_load_production(clean_prod)
    p_end = datetime.now(timezone.utc)
    loader.log_audit_entry(
        pipeline_name="production_stream",
        batch_id=batch_id,
        start_time=p_start,
        end_time=p_end,
        rows_extracted=prod_extracted,
        rows_loaded=prod_loaded,
        rows_rejected=len(quar_prod),
        rows_deduplicated=prod_dups,
        status="COMPLETED"
    )
    
    # 4. Process Sensor Telemetry Stream
    s_start = datetime.now(timezone.utc)
    sensor_extracted = len(raw_data["sensor_telemetry"])
    valid_sensor, quar_sensor = validator.validate_sensor_telemetry(raw_data["sensor_telemetry"], batch_id)
    total_quarantined.extend(quar_sensor)
    clean_sensor, sensor_dups = cleaner.clean_sensor_telemetry(valid_sensor)
    sensor_loaded = loader.bulk_load_sensors(clean_sensor)
    s_end = datetime.now(timezone.utc)
    loader.log_audit_entry(
        pipeline_name="sensor_telemetry_stream",
        batch_id=batch_id,
        start_time=s_start,
        end_time=s_end,
        rows_extracted=sensor_extracted,
        rows_loaded=sensor_loaded,
        rows_rejected=len(quar_sensor),
        rows_deduplicated=sensor_dups,
        status="COMPLETED"
    )
    
    # 5. Process Downtime Stream
    d_start = datetime.now(timezone.utc)
    dt_extracted = len(raw_data["downtime"])
    valid_dt, quar_dt = validator.validate_downtime(raw_data["downtime"], batch_id)
    total_quarantined.extend(quar_dt)
    clean_dt, dt_dups = cleaner.clean_downtime(valid_dt)
    dt_loaded = loader.bulk_load_downtime(clean_dt)
    d_end = datetime.now(timezone.utc)
    loader.log_audit_entry(
        pipeline_name="downtime_stream",
        batch_id=batch_id,
        start_time=d_start,
        end_time=d_end,
        rows_extracted=dt_extracted,
        rows_loaded=dt_loaded,
        rows_rejected=len(quar_dt),
        rows_deduplicated=dt_dups,
        status="COMPLETED"
    )
    
    # 6. Process Quality Stream
    q_start = datetime.now(timezone.utc)
    qual_extracted = len(raw_data["quality"])
    valid_qual, quar_qual = validator.validate_quality(raw_data["quality"], batch_id)
    total_quarantined.extend(quar_qual)
    clean_qual, qual_dups = cleaner.clean_quality(valid_qual)
    qual_loaded = loader.bulk_load_quality(clean_qual)
    q_end = datetime.now(timezone.utc)
    loader.log_audit_entry(
        pipeline_name="quality_stream",
        batch_id=batch_id,
        start_time=q_start,
        end_time=q_end,
        rows_extracted=qual_extracted,
        rows_loaded=qual_loaded,
        rows_rejected=len(quar_qual),
        rows_deduplicated=qual_dups,
        status="COMPLETED"
    )
    
    # 7. Store Quarantined Records
    if total_quarantined:
        loader.load_quarantine_records(total_quarantined)
        
    # 8. Refresh Materialized Views
    loader.refresh_materialized_views()
    
    # 9. Alert Evaluation & Incident Creation
    evaluator = AlertEvaluator(engine)
    incidents_created = evaluator.evaluate_and_generate_incidents()
    
    # 10. Generate Final Data Quality Report
    reporter = DataQualityReporter(engine)
    report = reporter.generate_report()
    
    end_all = datetime.now(timezone.utc)
    duration = (end_all - start_all).total_seconds()
    
    total_loaded = prod_loaded + sensor_loaded + dt_loaded + qual_loaded
    logger.info(f"=== FactoryPulse Pipeline Completed in {duration:.2f}s ===")
    logger.info(f"Loaded {total_loaded:,} fact records into PostgreSQL star schema.")
    logger.info(f"Quarantined {len(total_quarantined):,} rejected records.")
    logger.info(f"Opened {incidents_created} operational incidents.")
    
    return report

if __name__ == "__main__":
    db_conn = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/factorypulse")
    run_pipeline(db_url=db_conn)
