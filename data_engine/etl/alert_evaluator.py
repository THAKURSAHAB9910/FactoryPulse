"""
FactoryPulse Alert Rule Engine & Incident Generator
Evaluates loaded data against operational threshold rules and creates alerts & incidents.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy import create_engine, text

logger = logging.getLogger("AlertEvaluator")

DEFAULT_RULES = [
    {
        "rule_name": "Critical Low OEE",
        "metric_name": "OEE",
        "comparison_operator": "<",
        "threshold_value": 0.65,
        "severity": "CRITICAL",
        "description": "Triggered when shift or daily OEE drops below the 65% operational baseline."
    },
    {
        "rule_name": "Excessive Downtime Duration",
        "metric_name": "DOWNTIME_MINUTES",
        "comparison_operator": ">",
        "threshold_value": 30.0,
        "severity": "CRITICAL",
        "description": "Triggered when a single unplanned downtime event exceeds 30 minutes."
    },
    {
        "rule_name": "High Defect Rejection Rate",
        "metric_name": "REJECTION_RATE",
        "comparison_operator": ">",
        "threshold_value": 4.0,
        "severity": "WARNING",
        "description": "Triggered when batch scrap/rejection rate exceeds 4.0% of total output."
    },
    {
        "rule_name": "High Bearing Vibration",
        "metric_name": "VIBRATION_RMS",
        "comparison_operator": ">",
        "threshold_value": 4.5,
        "severity": "CRITICAL",
        "description": "Triggered when machine telemetry detects severe vibration RMS exceeding 4.5 mm/s."
    },
    {
        "rule_name": "Elevated Operating Temperature",
        "metric_name": "TEMPERATURE_C",
        "comparison_operator": ">",
        "threshold_value": 85.0,
        "severity": "WARNING",
        "description": "Triggered when spindle or motor temperature exceeds 85.0 Celsius."
    },
    {
        "rule_name": "Missed Production Target",
        "metric_name": "TARGET_ACHIEVEMENT",
        "comparison_operator": "<",
        "threshold_value": 80.0,
        "severity": "WARNING",
        "description": "Triggered when production output falls below 80% of rated capacity."
    }
]

class AlertEvaluator:
    def __init__(self, engine):
        self.engine = engine

    def seed_default_rules(self):
        logger.info("Ensuring default alert rules exist in database...")
        check_query = text("SELECT COUNT(*) FROM alert_rules;")
        with self.engine.begin() as conn:
            count = conn.execute(check_query).scalar()
            if count == 0:
                insert_query = text("""
                    INSERT INTO alert_rules (
                        rule_name, metric_name, comparison_operator, threshold_value, severity, description
                    ) VALUES (
                        :rule_name, :metric_name, :comparison_operator, :threshold_value, :severity, :description
                    );
                """)
                for r in DEFAULT_RULES:
                    conn.execute(insert_query, r)
                logger.info(f"Seeded {len(DEFAULT_RULES)} default alert rules.")

    def evaluate_and_generate_incidents(self) -> int:
        """
        Scans recent facts and materialized views, triggers alerts, and opens incidents.
        """
        self.seed_default_rules()
        logger.info("Evaluating alert rules against warehouse metrics...")
        
        created_count = 0
        with self.engine.begin() as conn:
            # 1. Evaluate Sensor Telemetry Anomalies
            telemetry_alerts_query = text("""
                INSERT INTO fact_alerts (
                    alert_id, rule_id, machine_id, shift_id, date_key,
                    triggered_at, metric_name, observed_value, threshold_value, severity, status
                )
                SELECT
                    uuid_generate_v4(),
                    r.rule_id,
                    t.machine_id,
                    'SHIFT-M',
                    t.date_key,
                    t.recorded_at,
                    r.metric_name,
                    t.vibration_rms,
                    r.threshold_value,
                    r.severity,
                    'OPEN'
                FROM fact_sensor_telemetry t
                CROSS JOIN alert_rules r
                WHERE r.metric_name = 'VIBRATION_RMS'
                  AND t.vibration_rms > r.threshold_value
                  AND t.is_anomaly = TRUE
                LIMIT 50
                ON CONFLICT DO NOTHING
                RETURNING alert_id, machine_id, metric_name, observed_value, threshold_value, severity;
            """)
            
            alerts = conn.execute(telemetry_alerts_query).fetchall()
            for row in alerts:
                # Create corresponding incident
                conn.execute(text("""
                    INSERT INTO incidents (
                        alert_id, machine_id, rule_name, metric_name, observed_value,
                        threshold_value, severity, status, root_cause
                    ) VALUES (
                        :alert_id, :machine_id, 'High Bearing Vibration Alert', :metric_name,
                        :observed, :threshold, :severity, 'OPEN', 'Impending bearing fatigue or loose mounting detected via vibration telemetry'
                    );
                """), {
                    "alert_id": row[0],
                    "machine_id": row[1],
                    "metric_name": row[2],
                    "observed": row[3],
                    "threshold": row[4],
                    "severity": row[5]
                })
                created_count += 1

            # 2. Evaluate Excessive Downtime (> 30 min)
            downtime_alerts_query = text("""
                INSERT INTO fact_alerts (
                    alert_id, rule_id, machine_id, shift_id, date_key,
                    triggered_at, metric_name, observed_value, threshold_value, severity, status
                )
                SELECT
                    uuid_generate_v4(),
                    r.rule_id,
                    dt.machine_id,
                    dt.shift_id,
                    dt.date_key,
                    dt.start_time,
                    r.metric_name,
                    dt.duration_minutes,
                    r.threshold_value,
                    r.severity,
                    'OPEN'
                FROM fact_downtime dt
                CROSS JOIN alert_rules r
                WHERE r.metric_name = 'DOWNTIME_MINUTES'
                  AND dt.duration_minutes > r.threshold_value
                LIMIT 50
                ON CONFLICT DO NOTHING
                RETURNING alert_id, machine_id, metric_name, observed_value, threshold_value, severity;
            """)
            
            dt_alerts = conn.execute(downtime_alerts_query).fetchall()
            for row in dt_alerts:
                conn.execute(text("""
                    INSERT INTO incidents (
                        alert_id, machine_id, rule_name, metric_name, observed_value,
                        threshold_value, severity, status, root_cause
                    ) VALUES (
                        :alert_id, :machine_id, 'Excessive Downtime Stoppage', :metric_name,
                        :observed, :threshold, :severity, 'OPEN', 'Unplanned breakdown exceeded 30 minute operational threshold'
                    );
                """), {
                    "alert_id": row[0],
                    "machine_id": row[1],
                    "metric_name": row[2],
                    "observed": row[3],
                    "threshold": row[4],
                    "severity": row[5]
                })
                created_count += 1
                
        logger.info(f"Alert engine evaluated: {created_count} new incidents opened.")
        return created_count
