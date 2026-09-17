-- ====================================================================
-- FactoryPulse: 04_create_indexes_views.sql
-- Performance Indexes, Materialized Views, and Refresh Automation
-- ====================================================================

-- 1. Performance Indexes
-- Dimension Lookups & Foreign Key Join Speedups
CREATE INDEX IF NOT EXISTS idx_prod_line_factory ON dim_production_line(factory_id);
CREATE INDEX IF NOT EXISTS idx_machine_line ON dim_machine(line_id);

-- fact_production Indexes
CREATE INDEX IF NOT EXISTS idx_fact_prod_date_machine ON fact_production(date_key, machine_id);
CREATE INDEX IF NOT EXISTS idx_fact_prod_line_shift ON fact_production(line_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_fact_prod_timestamp ON fact_production(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_fact_prod_mch_time ON fact_production(machine_id, event_timestamp DESC);

-- fact_downtime Indexes
CREATE INDEX IF NOT EXISTS idx_fact_dt_machine_start ON fact_downtime(machine_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_fact_dt_reason ON fact_downtime(reason_id);
CREATE INDEX IF NOT EXISTS idx_fact_dt_date_shift ON fact_downtime(date_key, shift_id);

-- fact_quality Indexes
CREATE INDEX IF NOT EXISTS idx_fact_qual_date_mch ON fact_quality(date_key, machine_id);
CREATE INDEX IF NOT EXISTS idx_fact_qual_product ON fact_quality(product_id);
CREATE INDEX IF NOT EXISTS idx_fact_qual_defect ON fact_quality(defect_id);

-- fact_sensor_telemetry Indexes (BRIN for high-volume append + Composite B-tree for machine range queries)
CREATE INDEX IF NOT EXISTS idx_telemetry_brin_time ON fact_sensor_telemetry USING BRIN (recorded_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_mch_time ON fact_sensor_telemetry(machine_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_anomaly ON fact_sensor_telemetry(is_anomaly) WHERE is_anomaly = TRUE;

-- Operational Incidents & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status_sev ON incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_mch ON incidents(machine_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_time ON etl_audit_log(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_quarantine_stream ON quarantine_records(source_stream, rejected_at DESC);

-- ====================================================================
-- 2. Materialized Views for Sub-Second BI Dashboards
-- ====================================================================

-- A. Daily Machine OEE Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_daily_machine_oee CASCADE;
CREATE MATERIALIZED VIEW mv_daily_machine_oee AS
WITH planned_time AS (
    SELECT
        d.date_key,
        d.full_date,
        m.machine_id,
        m.machine_name,
        m.line_id,
        pl.factory_id,
        -- Total planned time for 3 shifts = 3 * 435 minutes = 1305 minutes = 78,300 seconds
        (COUNT(DISTINCT s.shift_id) * 435.0)::NUMERIC(10, 2) AS planned_production_minutes
    FROM dim_machine m
    CROSS JOIN dim_date d
    CROSS JOIN dim_shift s
    JOIN dim_production_line pl ON m.line_id = pl.line_id
    WHERE d.full_date <= CURRENT_DATE
    GROUP BY d.date_key, d.full_date, m.machine_id, m.machine_name, m.line_id, pl.factory_id
),
downtime_agg AS (
    SELECT
        dt.date_key,
        dt.machine_id,
        COALESCE(SUM(dt.duration_minutes), 0)::NUMERIC(10, 2) AS total_downtime_minutes,
        COALESCE(SUM(CASE WHEN r.is_planned THEN dt.duration_minutes ELSE 0 END), 0)::NUMERIC(10, 2) AS planned_downtime_minutes,
        COALESCE(SUM(CASE WHEN NOT r.is_planned THEN dt.duration_minutes ELSE 0 END), 0)::NUMERIC(10, 2) AS unplanned_downtime_minutes,
        COUNT(CASE WHEN NOT r.is_planned THEN 1 END) AS breakdown_count
    FROM fact_downtime dt
    JOIN dim_downtime_reason r ON dt.reason_id = r.reason_id
    GROUP BY dt.date_key, dt.machine_id
),
production_agg AS (
    SELECT
        p.date_key,
        p.machine_id,
        COUNT(p.production_id) AS total_units_produced,
        COUNT(CASE WHEN p.is_good_part THEN 1 END) AS good_units,
        COUNT(CASE WHEN p.is_scrap THEN 1 END) AS scrap_units,
        COUNT(CASE WHEN p.is_rework THEN 1 END) AS rework_units,
        SUM(p.ideal_cycle_time_sec)::NUMERIC(12, 2) AS total_ideal_time_sec,
        SUM(p.actual_cycle_time_sec)::NUMERIC(12, 2) AS total_actual_time_sec,
        SUM(p.energy_kwh)::NUMERIC(10, 2) AS total_energy_kwh
    FROM fact_production p
    GROUP BY p.date_key, p.machine_id
)
SELECT
    pt.date_key,
    pt.full_date,
    pt.factory_id,
    pt.line_id,
    pt.machine_id,
    pt.machine_name,
    pt.planned_production_minutes,
    COALESCE(dt.total_downtime_minutes, 0) AS total_downtime_minutes,
    COALESCE(dt.unplanned_downtime_minutes, 0) AS unplanned_downtime_minutes,
    COALESCE(dt.breakdown_count, 0) AS breakdown_count,
    GREATEST(0, pt.planned_production_minutes - COALESCE(dt.total_downtime_minutes, 0)) AS operating_minutes,
    COALESCE(pr.total_units_produced, 0) AS total_units_produced,
    COALESCE(pr.good_units, 0) AS good_units,
    COALESCE(pr.scrap_units, 0) AS scrap_units,
    COALESCE(pr.rework_units, 0) AS rework_units,
    COALESCE(pr.total_ideal_time_sec, 0) AS total_ideal_time_sec,
    COALESCE(pr.total_energy_kwh, 0) AS total_energy_kwh,
    -- Availability = Operating Minutes / Planned Production Minutes
    ROUND(
        (GREATEST(0, pt.planned_production_minutes - COALESCE(dt.total_downtime_minutes, 0)) / NULLIF(pt.planned_production_minutes, 0))::NUMERIC,
        4
    ) AS availability_rate,
    -- Performance = (Total Produced * Ideal Cycle Sec) / (Operating Minutes * 60)
    ROUND(
        LEAST(1.0, (
            COALESCE(pr.total_ideal_time_sec, 0) /
            NULLIF(GREATEST(0, pt.planned_production_minutes - COALESCE(dt.total_downtime_minutes, 0)) * 60, 0)
        ))::NUMERIC,
        4
    ) AS performance_rate,
    -- Quality = Good Units / Total Units Produced
    ROUND(
        (COALESCE(pr.good_units, 0)::NUMERIC / NULLIF(pr.total_units_produced, 0))::NUMERIC,
        4
    ) AS quality_rate,
    -- OEE = Availability * Performance * Quality
    ROUND(
        (
            (GREATEST(0, pt.planned_production_minutes - COALESCE(dt.total_downtime_minutes, 0)) / NULLIF(pt.planned_production_minutes, 0)) *
            LEAST(1.0, (COALESCE(pr.total_ideal_time_sec, 0) / NULLIF(GREATEST(0, pt.planned_production_minutes - COALESCE(dt.total_downtime_minutes, 0)) * 60, 0))) *
            (COALESCE(pr.good_units, 0)::NUMERIC / NULLIF(pr.total_units_produced, 0))
        )::NUMERIC,
        4
    ) AS oee
FROM planned_time pt
LEFT JOIN downtime_agg dt ON pt.date_key = dt.date_key AND pt.machine_id = dt.machine_id
LEFT JOIN production_agg pr ON pt.date_key = pr.date_key AND pt.machine_id = pr.machine_id;

-- Index on Materialized View for fast queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_oee_pk ON mv_daily_machine_oee(date_key, machine_id);
CREATE INDEX IF NOT EXISTS idx_mv_daily_oee_factory ON mv_daily_machine_oee(factory_id, full_date);
CREATE INDEX IF NOT EXISTS idx_mv_daily_oee_line ON mv_daily_machine_oee(line_id, full_date);

-- B. Hourly Line Performance Rollup Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_hourly_line_performance CASCADE;
CREATE MATERIALIZED VIEW mv_hourly_line_performance AS
SELECT
    DATE_TRUNC('hour', p.event_timestamp) AS production_hour,
    p.factory_id,
    p.line_id,
    p.product_id,
    COUNT(p.production_id) AS total_parts,
    COUNT(CASE WHEN p.is_good_part THEN 1 END) AS good_parts,
    COUNT(CASE WHEN p.is_scrap THEN 1 END) AS scrap_parts,
    ROUND(AVG(p.actual_cycle_time_sec), 2) AS avg_cycle_time_sec,
    ROUND(AVG(p.ideal_cycle_time_sec), 2) AS target_cycle_time_sec,
    ROUND((COUNT(CASE WHEN p.is_scrap THEN 1 END)::NUMERIC / NULLIF(COUNT(p.production_id), 0)) * 100, 2) AS scrap_rate_pct
FROM fact_production p
GROUP BY DATE_TRUNC('hour', p.event_timestamp), p.factory_id, p.line_id, p.product_id;

CREATE INDEX IF NOT EXISTS idx_mv_hourly_line_time ON mv_hourly_line_performance(production_hour DESC, line_id);

-- C. Automation Function to Refresh Materialized Views
CREATE OR REPLACE FUNCTION refresh_manufacturing_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_machine_oee;
    REFRESH MATERIALIZED VIEW mv_hourly_line_performance;
END;
$$ LANGUAGE plpgsql;
