"""
FactoryPulse Data Quality Reporter
Calculates warehouse data health metrics (Completeness, Validity, Uniqueness, Timeliness).
"""

import logging
from typing import Dict, Any
from sqlalchemy import create_engine, text

logger = logging.getLogger("DataQualityReporter")

class DataQualityReporter:
    def __init__(self, engine):
        self.engine = engine

    def generate_report(self) -> Dict[str, Any]:
        """
        Calculates data quality metrics across all warehouse tables.
        """
        logger.info("Computing warehouse data quality metrics...")
        
        with self.engine.begin() as conn:
            # Fact row counts
            prod_count = conn.execute(text("SELECT COUNT(*) FROM fact_production;")).scalar() or 0
            sensor_count = conn.execute(text("SELECT COUNT(*) FROM fact_sensor_telemetry;")).scalar() or 0
            dt_count = conn.execute(text("SELECT COUNT(*) FROM fact_downtime;")).scalar() or 0
            qual_count = conn.execute(text("SELECT COUNT(*) FROM fact_quality;")).scalar() or 0
            
            # Quarantine & Audit
            quarantine_count = conn.execute(text("SELECT COUNT(*) FROM quarantine_records;")).scalar() or 0
            total_ingested = prod_count + sensor_count + dt_count + qual_count + quarantine_count
            
            # Audit log aggregates
            audit_stats = conn.execute(text("""
                SELECT
                    COALESCE(SUM(rows_extracted), 0),
                    COALESCE(SUM(rows_loaded), 0),
                    COALESCE(SUM(rows_rejected), 0),
                    COALESCE(SUM(rows_deduplicated), 0)
                FROM etl_audit_log;
            """)).fetchone()
            
            rows_extracted = audit_stats[0]
            rows_loaded = audit_stats[1]
            rows_rejected = audit_stats[2]
            rows_deduplicated = audit_stats[3]
            
            # Validity & Completeness Scores
            validity_score = round((rows_loaded / NULLIF(rows_extracted, 0)) * 100, 2) if rows_extracted > 0 else 100.0
            quarantine_rate = round((quarantine_count / NULLIF(total_ingested, 0)) * 100, 3) if total_ingested > 0 else 0.0
            
            # Sensor Anomaly Rate
            sensor_anomalies = conn.execute(text("""
                SELECT COUNT(*) FROM fact_sensor_telemetry WHERE is_anomaly = TRUE;
            """)).scalar() or 0
            sensor_anomaly_rate = round((sensor_anomalies / NULLIF(sensor_count, 0)) * 100, 2) if sensor_count > 0 else 0.0
            
            # Incident & Alert Stats
            open_incidents = conn.execute(text("SELECT COUNT(*) FROM incidents WHERE status = 'OPEN';")).scalar() or 0
            resolved_incidents = conn.execute(text("SELECT COUNT(*) FROM incidents WHERE status = 'RESOLVED';")).scalar() or 0

        report = {
            "warehouse_summary": {
                "total_records_stored": total_ingested,
                "fact_production_rows": prod_count,
                "fact_sensor_telemetry_rows": sensor_count,
                "fact_downtime_rows": dt_count,
                "fact_quality_rows": qual_count,
                "quarantine_rows": quarantine_count
            },
            "pipeline_health": {
                "rows_extracted": rows_extracted,
                "rows_loaded": rows_loaded,
                "rows_deduplicated": rows_deduplicated,
                "rows_rejected": rows_rejected,
                "data_validity_pct": validity_score,
                "quarantine_rate_pct": quarantine_rate
            },
            "telemetry_metrics": {
                "total_sensor_readings": sensor_count,
                "sensor_anomalies_detected": sensor_anomalies,
                "anomaly_rate_pct": sensor_anomaly_rate
            },
            "operational_governance": {
                "open_incidents_count": open_incidents,
                "resolved_incidents_count": resolved_incidents,
                "overall_data_health": "EXCELLENT" if validity_score >= 98.0 else "WARNING"
            }
        }
        
        logger.info(f"Data Quality Report computed. Overall Health: {report['operational_governance']['overall_data_health']} (Validity: {validity_score}%)")
        return report

def NULLIF(val, comp):
    return val if val != comp else None
