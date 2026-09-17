-- ====================================================================
-- FactoryPulse: 01_init_schema.sql
-- Database Initialization, Operational Tables, and System Governance
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Enum Types for Incidents and Alerts
DO $$ BEGIN
    CREATE TYPE incident_status_enum AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'ENGINEER', 'SUPERVISOR', 'OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Operational Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'OPERATOR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alert Rules Configuration
CREATE TABLE IF NOT EXISTS alert_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(128) NOT NULL,
    metric_name VARCHAR(64) NOT NULL, -- e.g. 'OEE', 'DOWNTIME_MINUTES', 'REJECTION_RATE', 'VIBRATION_RMS', 'TEMPERATURE_C'
    comparison_operator VARCHAR(8) NOT NULL, -- '<', '>', '<=', '>=', '=='
    threshold_value NUMERIC(12, 4) NOT NULL,
    severity alert_severity_enum NOT NULL DEFAULT 'WARNING',
    machine_type VARCHAR(64), -- NULL applies to all machine types
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Operational Incidents Table (Workflow management for alerts)
CREATE TABLE IF NOT EXISTS incidents (
    incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID, -- References fact_alerts if triggered automatically
    machine_id VARCHAR(32) NOT NULL,
    rule_name VARCHAR(128) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    observed_value NUMERIC(12, 4) NOT NULL,
    threshold_value NUMERIC(12, 4) NOT NULL,
    severity alert_severity_enum NOT NULL,
    status incident_status_enum NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    root_cause TEXT,
    corrective_action TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. ETL Audit Log
CREATE TABLE IF NOT EXISTS etl_audit_log (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_name VARCHAR(64) NOT NULL,
    batch_identifier VARCHAR(64) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    rows_extracted INT NOT NULL DEFAULT 0,
    rows_loaded INT NOT NULL DEFAULT 0,
    rows_rejected INT NOT NULL DEFAULT 0,
    rows_deduplicated INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL, -- 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'
    error_message TEXT,
    execution_time_seconds NUMERIC(10, 3)
);

-- 5. Quarantine Records (Rejected / Corrupt records with reason)
CREATE TABLE IF NOT EXISTS quarantine_records (
    quarantine_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_identifier VARCHAR(64),
    source_stream VARCHAR(64) NOT NULL, -- 'production', 'downtime', 'quality', 'sensor'
    raw_record JSONB NOT NULL,
    rejection_reason VARCHAR(256) NOT NULL,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
