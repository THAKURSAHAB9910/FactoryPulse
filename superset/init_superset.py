"""
FactoryPulse Superset Automated Bootstrap Script
Connects PostgreSQL datasource, registers datasets, builds 5 dashboards and configures native filters.
"""

import os
import json
import logging
from superset.app import create_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SupersetInit")

def bootstrap_superset():
    app = create_app()
    with app.app_context():
        from superset import db
        from superset.models.core import Database
        from superset.connectors.sqla.models import SqlaTable, SqlMetric
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        logger.info("Connecting FactoryPulse PostgreSQL warehouse database...")

        db_uri = os.getenv("WAREHOUSE_DATABASE_URI", "postgresql://postgres:postgres@postgres:5432/factorypulse")
        
        # 1. Register Database
        database = db.session.query(Database).filter_by(database_name="FactoryPulse Warehouse").first()
        if not database:
            database = Database(
                database_name="FactoryPulse Warehouse",
                sqlalchemy_uri=db_uri,
                expose_in_sqllab=True,
                allow_ctas=True,
                allow_cvas=True,
                allow_dml=False,
                allow_run_async=True
            )
            db.session.add(database)
            db.session.commit()
            logger.info("FactoryPulse Warehouse database registered.")
        else:
            logger.info("FactoryPulse Warehouse database already exists.")

        # 2. Register Datasets
        tables = [
            ("mv_daily_machine_oee", "Daily Machine OEE Materialized View"),
            ("fact_production", "Production Fact"),
            ("fact_downtime", "Downtime Fact"),
            ("fact_sensor_telemetry", "High Frequency Sensor Telemetry"),
            ("fact_quality", "Quality Fact"),
            ("incidents", "Operational Incidents")
        ]
        
        registered_tables = {}
        for tbl_name, description in tables:
            tbl = db.session.query(SqlaTable).filter_by(table_name=tbl_name, database_id=database.id).first()
            if not tbl:
                tbl = SqlaTable(
                    table_name=tbl_name,
                    schema="public",
                    database_id=database.id,
                    description=description
                )
                db.session.add(tbl)
                db.session.commit()
                # Fetch columns
                try:
                    tbl.fetch_metadata()
                    db.session.commit()
                except Exception as e:
                    logger.warning(f"Could not fetch metadata for {tbl_name}: {e}")
            registered_tables[tbl_name] = tbl
            logger.info(f"Dataset registered: {tbl_name}")

        # 3. Create 5 Dashboards
        dashboards_config = [
            {
                "title": "Executive Factory Performance",
                "slug": "executive-factory-performance",
                "description": "Enterprise-level OEE, Availability, Performance, Quality, and multi-factory benchmarking."
            },
            {
                "title": "Machine Monitoring & Telemetry",
                "slug": "machine-monitoring-telemetry",
                "description": "Real-time vibration, temperature, pressure telemetry, and anomaly heatmaps."
            },
            {
                "title": "Shift & Production Line Analysis",
                "slug": "shift-line-analysis",
                "description": "Shift-by-shift output, line bottlenecks, and target achievement tracking."
            },
            {
                "title": "Quality & Defect Pareto",
                "slug": "quality-defect-pareto",
                "description": "Defect classification, scrap costs, rework volumes, and first-pass yield."
            },
            {
                "title": "Active Alerts & Downtime Incident Hub",
                "slug": "active-alerts-downtime-hub",
                "description": "Top downtime reasons Pareto, MTBF/MTTR trends, and active alert severity breakdown."
            }
        ]

        for d in dashboards_config:
            dash = db.session.query(Dashboard).filter_by(slug=d["slug"]).first()
            if not dash:
                # Setup native filters JSON
                native_filter_config = [
                    {"id": "NATIVE_FILTER_DATE", "name": "Date Range", "filterType": "filter_time"},
                    {"id": "NATIVE_FILTER_FACTORY", "name": "Factory", "filterType": "filter_select", "targets": [{"column": {"name": "factory_id"}}]},
                    {"id": "NATIVE_FILTER_LINE", "name": "Production Line", "filterType": "filter_select", "targets": [{"column": {"name": "line_id"}}]},
                    {"id": "NATIVE_FILTER_MACHINE", "name": "Machine", "filterType": "filter_select", "targets": [{"column": {"name": "machine_id"}}]},
                    {"id": "NATIVE_FILTER_PRODUCT", "name": "Product", "filterType": "filter_select", "targets": [{"column": {"name": "product_id"}}]},
                    {"id": "NATIVE_FILTER_SHIFT", "name": "Shift", "filterType": "filter_select", "targets": [{"column": {"name": "shift_id"}}]}
                ]
                
                json_metadata = {
                    "native_filter_configuration": native_filter_config,
                    "color_scheme": "supersetColors",
                    "timed_refresh_immune_slices": []
                }
                
                dash = Dashboard(
                    dashboard_title=d["title"],
                    slug=d["slug"],
                    published=True,
                    json_metadata=json.dumps(json_metadata)
                )
                db.session.add(dash)
                db.session.commit()
                logger.info(f"Dashboard created: {d['title']} (Slug: {d['slug']}) with 6 Native Filters.")
            else:
                logger.info(f"Dashboard already exists: {d['title']}")

        logger.info("FactoryPulse Superset initialization completed successfully!")

if __name__ == "__main__":
    bootstrap_superset()
