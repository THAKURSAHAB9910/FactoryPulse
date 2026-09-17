-- ====================================================================
-- FactoryPulse: 05_advanced_metrics_queries.sql
-- Advanced Analytical SQL: OEE, MTBF, MTTR, Cycle Time & Window Functions
-- ====================================================================

-- ====================================================================
-- 1. OVERALL EQUIPMENT EFFECTIVENESS (OEE) CALCULATION WITH BREAKDOWN
-- Metrics: Availability, Performance, Quality, Production Achievement
-- ====================================================================
WITH shift_metrics AS (
    SELECT
        p.date_key,
        p.factory_id,
        p.line_id,
        p.machine_id,
        p.shift_id,
        COUNT(p.production_id) AS total_count,
        SUM(CASE WHEN p.is_good_part THEN 1 ELSE 0 END) AS good_count,
        SUM(CASE WHEN p.is_scrap THEN 1 ELSE 0 END) AS scrap_count,
        SUM(CASE WHEN p.is_rework THEN 1 ELSE 0 END) AS rework_count,
        SUM(p.ideal_cycle_time_sec) AS total_ideal_time_sec,
        AVG(p.actual_cycle_time_sec) AS avg_actual_cycle_sec,
        AVG(p.ideal_cycle_time_sec) AS avg_target_cycle_sec
    FROM fact_production p
    GROUP BY p.date_key, p.factory_id, p.line_id, p.machine_id, p.shift_id
),
downtime_summary AS (
    SELECT
        dt.date_key,
        dt.machine_id,
        dt.shift_id,
        SUM(dt.duration_minutes) AS total_downtime_min,
        SUM(CASE WHEN r.is_planned THEN dt.duration_minutes ELSE 0 END) AS planned_downtime_min,
        SUM(CASE WHEN NOT r.is_planned THEN dt.duration_minutes ELSE 0 END) AS unplanned_downtime_min
    FROM fact_downtime dt
    JOIN dim_downtime_reason r ON dt.reason_id = r.reason_id
    GROUP BY dt.date_key, dt.machine_id, dt.shift_id
),
shift_plan AS (
    SELECT
        sm.date_key,
        sm.factory_id,
        sm.line_id,
        sm.machine_id,
        sm.shift_id,
        s.planned_production_minutes,
        COALESCE(dt.total_downtime_min, 0) AS total_downtime_min,
        COALESCE(dt.unplanned_downtime_min, 0) AS unplanned_downtime_min,
        GREATEST(0, s.planned_production_minutes - COALESCE(dt.total_downtime_min, 0)) AS operating_minutes,
        sm.total_count,
        sm.good_count,
        sm.scrap_count,
        sm.total_ideal_time_sec,
        sm.avg_actual_cycle_sec,
        sm.avg_target_cycle_sec
    FROM shift_metrics sm
    JOIN dim_shift s ON sm.shift_id = s.shift_id
    LEFT JOIN downtime_summary dt ON sm.date_key = dt.date_key AND sm.machine_id = dt.machine_id AND sm.shift_id = dt.shift_id
)
SELECT
    sp.date_key,
    d.full_date,
    f.factory_name,
    pl.line_name,
    m.machine_name,
    s.shift_name,
    sp.planned_production_minutes,
    sp.operating_minutes,
    sp.total_downtime_min,
    sp.total_count AS total_production,
    sp.good_count,
    sp.scrap_count,
    -- 1. Availability = Operating Time / Planned Production Time
    ROUND((sp.operating_minutes::NUMERIC / NULLIF(sp.planned_production_minutes, 0)), 4) AS availability,
    -- 2. Performance = (Total Parts * Ideal Cycle Time Sec) / (Operating Minutes * 60)
    ROUND(LEAST(1.0, (sp.total_ideal_time_sec::NUMERIC / NULLIF(sp.operating_minutes * 60, 0))), 4) AS performance,
    -- 3. Quality = Good Parts / Total Parts
    ROUND((sp.good_count::NUMERIC / NULLIF(sp.total_count, 0)), 4) AS quality,
    -- 4. OEE = Availability * Performance * Quality
    ROUND(
        (sp.operating_minutes::NUMERIC / NULLIF(sp.planned_production_minutes, 0)) *
        LEAST(1.0, (sp.total_ideal_time_sec::NUMERIC / NULLIF(sp.operating_minutes * 60, 0))) *
        (sp.good_count::NUMERIC / NULLIF(sp.total_count, 0)),
        4
    ) AS oee,
    -- 5. Rejection Rate = Scrap Count / Total Parts
    ROUND((sp.scrap_count::NUMERIC / NULLIF(sp.total_count, 0)) * 100, 2) AS rejection_rate_pct,
    -- 6. Production Achievement = Actual Output / Designed Line Capacity per shift
    ROUND((sp.total_count::NUMERIC / NULLIF((pl.designed_capacity_uph * (s.planned_production_minutes / 60.0)), 0)) * 100, 2) AS target_achievement_pct
FROM shift_plan sp
JOIN dim_date d ON sp.date_key = d.date_key
JOIN dim_factory f ON sp.factory_id = f.factory_id
JOIN dim_production_line pl ON sp.line_id = pl.line_id
JOIN dim_machine m ON sp.machine_id = m.machine_id
JOIN dim_shift s ON sp.shift_id = s.shift_id
ORDER BY sp.date_key DESC, f.factory_name, pl.line_name, m.machine_name;


-- ====================================================================
-- 2. RELIABILITY INTELLIGENCE: MTBF & MTTR CALCULATION USING WINDOW FUNCTIONS
-- MTBF = Mean Time Between Failures = Total Operating Time / Breakdown Count
-- MTTR = Mean Time To Repair = Total Unplanned Downtime / Breakdown Count
-- Time Between Failures calculated using LAG(end_time) windowing
-- ====================================================================
WITH ranked_breakdowns AS (
    SELECT
        dt.machine_id,
        m.machine_name,
        m.line_id,
        dt.start_time,
        dt.end_time,
        dt.duration_minutes,
        r.reason_name,
        -- Previous failure's end time for the same machine
        LAG(dt.end_time) OVER (
            PARTITION BY dt.machine_id 
            ORDER BY dt.start_time ASC
        ) AS prev_failure_end_time,
        -- Calculate uptime duration in hours between consecutive failures
        ROUND(
            EXTRACT(EPOCH FROM (dt.start_time - LAG(dt.end_time) OVER (
                PARTITION BY dt.machine_id 
                ORDER BY dt.start_time ASC
            ))) / 3600.0,
            2
        ) AS time_between_failures_hours
    FROM fact_downtime dt
    JOIN dim_machine m ON dt.machine_id = m.machine_id
    JOIN dim_downtime_reason r ON dt.reason_id = r.reason_id
    WHERE r.is_planned = FALSE -- Only unplanned equipment breakdowns
),
reliability_aggregates AS (
    SELECT
        rb.machine_id,
        rb.machine_name,
        rb.line_id,
        COUNT(*) AS total_breakdowns,
        ROUND(SUM(rb.duration_minutes) / 60.0, 2) AS total_repair_hours,
        ROUND(AVG(rb.duration_minutes), 2) AS avg_repair_minutes,
        -- MTTR in hours
        ROUND((SUM(rb.duration_minutes) / 60.0) / NULLIF(COUNT(*), 0), 2) AS mttr_hours,
        -- MTBF in hours: average operating time between consecutive failures
        ROUND(AVG(rb.time_between_failures_hours), 2) AS mtbf_hours
    FROM ranked_breakdowns rb
    WHERE rb.time_between_failures_hours IS NOT NULL
    GROUP BY rb.machine_id, rb.machine_name, rb.line_id
)
SELECT
    ra.machine_id,
    ra.machine_name,
    pl.line_name,
    ra.total_breakdowns,
    ra.total_repair_hours,
    ra.mttr_hours,
    ra.mtbf_hours,
    -- Inherent Equipment Availability = MTBF / (MTBF + MTTR)
    ROUND((ra.mtbf_hours / NULLIF(ra.mtbf_hours + ra.mttr_hours, 0)) * 100, 2) AS inherent_availability_pct,
    -- Reliability Ranking using DENSE_RANK()
    DENSE_RANK() OVER (ORDER BY ra.mtbf_hours DESC NULLS LAST) AS reliability_rank
FROM reliability_aggregates ra
JOIN dim_production_line pl ON ra.line_id = pl.line_id
ORDER BY ra.mtbf_hours ASC;


-- ====================================================================
-- 3. ROLLING 7-DAY OEE & MOVING AVERAGE USING WINDOW FUNCTIONS
-- Demonstrates rolling aggregates, window framing (ROWS BETWEEN), and trend analysis
-- ====================================================================
WITH daily_oee_series AS (
    SELECT
        full_date,
        machine_id,
        machine_name,
        line_id,
        oee,
        availability_rate,
        performance_rate,
        quality_rate
    FROM mv_daily_machine_oee
)
SELECT
    d.full_date,
    d.machine_id,
    d.machine_name,
    d.oee AS daily_oee,
    -- 7-day Rolling Average OEE
    ROUND(AVG(d.oee) OVER (
        PARTITION BY d.machine_id 
        ORDER BY d.full_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 4) AS rolling_7d_oee,
    -- Previous Day OEE using LAG
    LAG(d.oee, 1) OVER (
        PARTITION BY d.machine_id 
        ORDER BY d.full_date
    ) AS prev_day_oee,
    -- Day-over-Day Delta
    ROUND(
        d.oee - LAG(d.oee, 1) OVER (
            PARTITION BY d.machine_id 
            ORDER BY d.full_date
        ),
        4
    ) AS oee_dod_delta,
    -- Rolling 7-day Minimum and Maximum to detect volatility
    ROUND(MIN(d.oee) OVER (
        PARTITION BY d.machine_id 
        ORDER BY d.full_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 4) AS rolling_7d_min_oee,
    ROUND(MAX(d.oee) OVER (
        PARTITION BY d.machine_id 
        ORDER BY d.full_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 4) AS rolling_7d_max_oee
FROM daily_oee_series d
ORDER BY d.machine_id, d.full_date DESC;


-- ====================================================================
-- 4. MICRO-STOPPAGE SESSIONIZATION & PARETO ANALYSIS
-- Classifies downtime into Micro-Stoppages (< 5 min) vs Major Breakdowns (>= 5 min)
-- Uses cumulative sum window functions to compute 80/20 Pareto distribution
-- ====================================================================
WITH downtime_classified AS (
    SELECT
        dt.reason_id,
        r.reason_name,
        r.category,
        dt.is_micro_stoppage,
        COUNT(*) AS event_count,
        SUM(dt.duration_minutes) AS total_lost_minutes
    FROM fact_downtime dt
    JOIN dim_downtime_reason r ON dt.reason_id = r.reason_id
    GROUP BY dt.reason_id, r.reason_name, r.category, dt.is_micro_stoppage
),
category_pareto AS (
    SELECT
        dc.reason_id,
        dc.reason_name,
        dc.category,
        CASE WHEN dc.is_micro_stoppage THEN 'Micro-Stoppage (<5m)' ELSE 'Major Breakdown (>=5m)' END AS stoppage_type,
        dc.event_count,
        dc.total_lost_minutes,
        -- Cumulative lost minutes for Pareto curve
        SUM(dc.total_lost_minutes) OVER (
            ORDER BY dc.total_lost_minutes DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_lost_minutes,
        -- Total lost minutes across all events
        SUM(dc.total_lost_minutes) OVER () AS grand_total_lost_minutes
    FROM downtime_classified dc
)
SELECT
    cp.reason_id,
    cp.reason_name,
    cp.category,
    cp.stoppage_type,
    cp.event_count,
    ROUND(cp.total_lost_minutes, 1) AS total_lost_minutes,
    ROUND((cp.total_lost_minutes / NULLIF(cp.grand_total_lost_minutes, 0)) * 100, 2) AS pct_of_total_downtime,
    ROUND((cp.cumulative_lost_minutes / NULLIF(cp.grand_total_lost_minutes, 0)) * 100, 2) AS pareto_cumulative_pct,
    -- Rank reasons by total lost time
    ROW_NUMBER() OVER (ORDER BY cp.total_lost_minutes DESC) AS pareto_rank
FROM category_pareto cp
ORDER BY cp.total_lost_minutes DESC;
