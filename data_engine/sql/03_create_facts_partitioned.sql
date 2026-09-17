-- ====================================================================
-- FactoryPulse: 03_create_facts_partitioned.sql
-- Star Schema Fact Tables with Partitioning for High-Frequency Telemetry
-- ====================================================================

-- 1. Production Events Fact
CREATE TABLE IF NOT EXISTS fact_production (
    production_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_timestamp TIMESTAMPTZ NOT NULL,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    factory_id VARCHAR(32) NOT NULL REFERENCES dim_factory(factory_id),
    line_id VARCHAR(32) NOT NULL REFERENCES dim_production_line(line_id),
    machine_id VARCHAR(32) NOT NULL REFERENCES dim_machine(machine_id),
    product_id VARCHAR(32) NOT NULL REFERENCES dim_product(product_id),
    shift_id VARCHAR(32) NOT NULL REFERENCES dim_shift(shift_id),
    batch_id VARCHAR(64) NOT NULL,
    part_serial_number VARCHAR(64) UNIQUE NOT NULL,
    ideal_cycle_time_sec NUMERIC(8, 2) NOT NULL,
    actual_cycle_time_sec NUMERIC(8, 2) NOT NULL,
    is_good_part BOOLEAN NOT NULL DEFAULT TRUE,
    is_rework BOOLEAN NOT NULL DEFAULT FALSE,
    is_scrap BOOLEAN NOT NULL DEFAULT FALSE,
    energy_kwh NUMERIC(8, 4) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Downtime Events Fact
CREATE TABLE IF NOT EXISTS fact_downtime (
    downtime_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id VARCHAR(32) NOT NULL REFERENCES dim_machine(machine_id),
    shift_id VARCHAR(32) NOT NULL REFERENCES dim_shift(shift_id),
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    reason_id VARCHAR(32) NOT NULL REFERENCES dim_downtime_reason(reason_id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes NUMERIC(10, 2) NOT NULL,
    is_micro_stoppage BOOLEAN NOT NULL DEFAULT FALSE, -- < 5 minutes
    operator_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Quality Inspections Fact
CREATE TABLE IF NOT EXISTS fact_quality (
    quality_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_timestamp TIMESTAMPTZ NOT NULL,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    machine_id VARCHAR(32) NOT NULL REFERENCES dim_machine(machine_id),
    product_id VARCHAR(32) NOT NULL REFERENCES dim_product(product_id),
    shift_id VARCHAR(32) NOT NULL REFERENCES dim_shift(shift_id),
    defect_id VARCHAR(32) REFERENCES dim_defect_reason(defect_id),
    inspected_count INT NOT NULL DEFAULT 1,
    defect_count INT NOT NULL DEFAULT 0,
    scrap_count INT NOT NULL DEFAULT 0,
    rework_count INT NOT NULL DEFAULT 0,
    defect_rate_pct NUMERIC(6, 3) NOT NULL DEFAULT 0.0,
    scrap_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. High-Frequency Sensor Telemetry (PARTITIONED by range on recorded_at)
CREATE TABLE IF NOT EXISTS fact_sensor_telemetry (
    telemetry_id UUID DEFAULT uuid_generate_v4(),
    machine_id VARCHAR(32) NOT NULL REFERENCES dim_machine(machine_id),
    recorded_at TIMESTAMPTZ NOT NULL,
    date_key INT NOT NULL,
    vibration_rms NUMERIC(8, 3) NOT NULL, -- mm/s
    temperature_c NUMERIC(8, 2) NOT NULL, -- Celsius
    pressure_bar NUMERIC(8, 2) NOT NULL,  -- Bar
    power_kw NUMERIC(8, 2) NOT NULL,      -- kW
    motor_rpm NUMERIC(8, 1) NOT NULL,     -- RPM
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (recorded_at, telemetry_id)
) PARTITION BY RANGE (recorded_at);

-- Partitions for 2026 Telemetry
CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_07 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_08 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_09 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_10 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_11 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_2026_12 PARTITION OF fact_sensor_telemetry
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS fact_sensor_telemetry_default PARTITION OF fact_sensor_telemetry
    DEFAULT;

-- 5. Automated Alerts Fact Table
CREATE TABLE IF NOT EXISTS fact_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES alert_rules(rule_id),
    machine_id VARCHAR(32) NOT NULL REFERENCES dim_machine(machine_id),
    shift_id VARCHAR(32) NOT NULL REFERENCES dim_shift(shift_id),
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    triggered_at TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    observed_value NUMERIC(12, 4) NOT NULL,
    threshold_value NUMERIC(12, 4) NOT NULL,
    severity alert_severity_enum NOT NULL DEFAULT 'WARNING',
    status incident_status_enum NOT NULL DEFAULT 'OPEN',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
