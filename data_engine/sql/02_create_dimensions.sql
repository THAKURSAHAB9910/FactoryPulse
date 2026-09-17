-- ====================================================================
-- FactoryPulse: 02_create_dimensions.sql
-- Star Schema Dimension Tables & Seed Reference Data
-- ====================================================================

-- 1. Factory Dimension
CREATE TABLE IF NOT EXISTS dim_factory (
    factory_id VARCHAR(32) PRIMARY KEY,
    factory_name VARCHAR(128) NOT NULL,
    country VARCHAR(64) NOT NULL,
    city VARCHAR(64) NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    operating_since DATE NOT NULL,
    floor_area_sqm INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Production Line Dimension
CREATE TABLE IF NOT EXISTS dim_production_line (
    line_id VARCHAR(32) PRIMARY KEY,
    factory_id VARCHAR(32) NOT NULL REFERENCES dim_factory(factory_id),
    line_name VARCHAR(128) NOT NULL,
    line_type VARCHAR(64) NOT NULL, -- 'STAMPING', 'WELDING', 'MACHINING', 'ASSEMBLY', 'PAINT'
    designed_capacity_uph NUMERIC(8, 2) NOT NULL, -- Units Per Hour
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Machine Dimension
CREATE TABLE IF NOT EXISTS dim_machine (
    machine_id VARCHAR(32) PRIMARY KEY,
    line_id VARCHAR(32) NOT NULL REFERENCES dim_production_line(line_id),
    machine_name VARCHAR(128) NOT NULL,
    machine_type VARCHAR(64) NOT NULL, -- 'HYDRAULIC_PRESS', 'ROBOTIC_WELDER', 'CNC_5AXIS', 'PAINT_BOOTH', 'CONVEYOR_SYSTEM', 'CMM_INSPECTION'
    model_number VARCHAR(64) NOT NULL,
    manufacturer VARCHAR(64) NOT NULL,
    installation_date DATE NOT NULL,
    ideal_cycle_time_sec NUMERIC(8, 2) NOT NULL,
    max_rated_power_kw NUMERIC(8, 2) NOT NULL,
    is_bottleneck BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Product Dimension
CREATE TABLE IF NOT EXISTS dim_product (
    product_id VARCHAR(32) PRIMARY KEY,
    product_code VARCHAR(32) UNIQUE NOT NULL,
    product_name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'POWERTRAIN', 'CHASSIS', 'BATTERY_ENCLOSURE', 'BODY_PANEL'
    target_cycle_time_sec NUMERIC(8, 2) NOT NULL,
    unit_cost_usd NUMERIC(10, 2) NOT NULL,
    scrap_cost_usd NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. Shift Dimension
CREATE TABLE IF NOT EXISTS dim_shift (
    shift_id VARCHAR(32) PRIMARY KEY,
    shift_name VARCHAR(64) NOT NULL, -- 'Morning Shift', 'Afternoon Shift', 'Night Shift'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.0,
    planned_break_minutes INT NOT NULL DEFAULT 45,
    planned_production_minutes INT NOT NULL DEFAULT 435 -- (8 * 60) - 45 = 435 min
);

-- 6. Date Dimension
CREATE TABLE IF NOT EXISTS dim_date (
    date_key INT PRIMARY KEY, -- Format: YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    day_of_week INT NOT NULL, -- 1=Monday, 7=Sunday
    day_name VARCHAR(16) NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    week_of_year INT NOT NULL,
    month_num INT NOT NULL,
    month_name VARCHAR(16) NOT NULL,
    quarter INT NOT NULL,
    year INT NOT NULL
);

-- 7. Downtime Reason Dimension
CREATE TABLE IF NOT EXISTS dim_downtime_reason (
    reason_id VARCHAR(32) PRIMARY KEY,
    category VARCHAR(64) NOT NULL, -- 'PLANNED', 'UNPLANNED_MECHANICAL', 'UNPLANNED_ELECTRICAL', 'OPERATIONAL', 'MATERIAL_SHORTAGE'
    reason_code VARCHAR(32) UNIQUE NOT NULL,
    reason_name VARCHAR(128) NOT NULL,
    is_planned BOOLEAN NOT NULL,
    default_severity alert_severity_enum NOT NULL DEFAULT 'WARNING'
);

-- 8. Defect Reason Dimension
CREATE TABLE IF NOT EXISTS dim_defect_reason (
    defect_id VARCHAR(32) PRIMARY KEY,
    defect_code VARCHAR(32) UNIQUE NOT NULL,
    defect_category VARCHAR(64) NOT NULL, -- 'DIMENSIONAL', 'SURFACE_FINISH', 'WELDING', 'POROSITY', 'CONTAMINATION'
    defect_name VARCHAR(128) NOT NULL,
    is_critical BOOLEAN NOT NULL DEFAULT FALSE
);

-- ====================================================================
-- Reference Data Seeding
-- ====================================================================

-- Seed Factories
INSERT INTO dim_factory (factory_id, factory_name, country, city, timezone, operating_since, floor_area_sqm)
VALUES
    ('FACT-01', 'Detroit Automotive Plant 1', 'USA', 'Detroit', 'America/Detroit', '2016-03-15', 45000),
    ('FACT-02', 'Stuttgart Precision Works', 'Germany', 'Stuttgart', 'Europe/Berlin', '2018-07-01', 38000),
    ('FACT-03', 'Yokohama Advanced Mobility', 'Japan', 'Yokohama', 'Asia/Tokyo', '2020-11-10', 42000)
ON CONFLICT (factory_id) DO NOTHING;

-- Seed Production Lines
INSERT INTO dim_production_line (line_id, factory_id, line_name, line_type, designed_capacity_uph)
VALUES
    ('LINE-01-A', 'FACT-01', 'Press & Stamping Line A', 'STAMPING', 120.0),
    ('LINE-01-B', 'FACT-01', 'Robotic Welding Line B', 'WELDING', 90.0),
    ('LINE-01-C', 'FACT-01', 'Engine Block CNC Line C', 'MACHINING', 60.0),
    ('LINE-02-A', 'FACT-02', 'Chassis Assembly Line Alpha', 'ASSEMBLY', 80.0),
    ('LINE-02-B', 'FACT-02', 'Precision Machining Line Beta', 'MACHINING', 75.0),
    ('LINE-03-A', 'FACT-03', 'EV Battery Pack Assembly Line 1', 'ASSEMBLY', 85.0),
    ('LINE-03-B', 'FACT-03', 'Robotic Paint & Seal Line 2', 'PAINT', 100.0)
ON CONFLICT (line_id) DO NOTHING;

-- Seed Machines
INSERT INTO dim_machine (machine_id, line_id, machine_name, machine_type, model_number, manufacturer, installation_date, ideal_cycle_time_sec, max_rated_power_kw, is_bottleneck)
VALUES
    ('MCH-01-01', 'LINE-01-A', 'Schuler Servo Press 2500T', 'HYDRAULIC_PRESS', 'SP-2500', 'Schuler AG', '2019-01-10', 30.0, 350.0, TRUE),
    ('MCH-01-02', 'LINE-01-A', 'Aida Transfer Press 1000T', 'HYDRAULIC_PRESS', 'TP-1000', 'Aida Engineering', '2019-04-12', 32.0, 200.0, FALSE),
    ('MCH-01-03', 'LINE-01-B', 'KUKA Robotic Cell Weld-01', 'ROBOTIC_WELDER', 'KR-QUANTEC', 'KUKA Robotics', '2020-02-15', 40.0, 45.0, FALSE),
    ('MCH-01-04', 'LINE-01-B', 'Fanuc Spot Welding Cell 02', 'ROBOTIC_WELDER', 'R-2000iC', 'Fanuc Corp', '2020-03-01', 40.0, 50.0, TRUE),
    ('MCH-01-05', 'LINE-01-C', 'DMG MORI 5-Axis CNC Mill 01', 'CNC_5AXIS', 'DMU-85-FD', 'DMG MORI', '2021-06-20', 60.0, 85.0, TRUE),
    ('MCH-01-06', 'LINE-01-C', 'Mazak Integrex Multi-Tasking 02', 'CNC_5AXIS', 'i-400', 'Yamazaki Mazak', '2021-08-14', 55.0, 75.0, FALSE),
    ('MCH-02-01', 'LINE-02-A', 'Atlas Copco Smart Assembly Cell', 'CONVEYOR_SYSTEM', 'PF-6000', 'Atlas Copco', '2020-09-05', 45.0, 30.0, FALSE),
    ('MCH-02-02', 'LINE-02-A', 'Zeiss High-Speed CMM Inspector', 'CMM_INSPECTION', 'PRISMO-verity', 'Carl Zeiss', '2021-01-18', 45.0, 20.0, TRUE),
    ('MCH-02-03', 'LINE-02-B', 'Hermle C42 5-Axis Machining Center', 'CNC_5AXIS', 'C-42-MT', 'Hermle AG', '2021-10-09', 48.0, 65.0, FALSE),
    ('MCH-03-01', 'LINE-03-A', 'Panasonic Battery Cell Welder', 'ROBOTIC_WELDER', 'TL-1800', 'Panasonic Robotics', '2022-03-12', 42.0, 60.0, TRUE),
    ('MCH-03-02', 'LINE-03-A', 'Bosch Rexroth Automated Line Conveyor', 'CONVEYOR_SYSTEM', 'TS-5', 'Bosch Rexroth', '2022-04-10', 42.0, 25.0, FALSE),
    ('MCH-03-03', 'LINE-03-B', 'Durr EcoPaint Automated Booth', 'PAINT_BOOTH', 'EcoRP-E043i', 'Durr Systems', '2022-07-22', 36.0, 180.0, TRUE)
ON CONFLICT (machine_id) DO NOTHING;

-- Seed Products
INSERT INTO dim_product (product_id, product_code, product_name, category, target_cycle_time_sec, unit_cost_usd, scrap_cost_usd)
VALUES
    ('PROD-001', 'ENG-V8-BLK', 'V8 High-Output Engine Block', 'POWERTRAIN', 60.0, 1250.00, 420.00),
    ('PROD-002', 'TURBO-HSG', 'Twin-Scroll Turbocharger Housing', 'POWERTRAIN', 45.0, 480.00, 160.00),
    ('PROD-003', 'EV-BAT-ENC', 'Modular Battery Pack Enclosure', 'BATTERY_ENCLOSURE', 50.0, 1850.00, 650.00),
    ('PROD-004', 'CHS-KNKL', 'High-Strength Suspension Knuckle', 'CHASSIS', 35.0, 320.00, 95.00),
    ('PROD-005', 'BODY-DR-OUT', 'Reinforced Side Door Outer Panel', 'BODY_PANEL', 30.0, 290.00, 85.00)
ON CONFLICT (product_id) DO NOTHING;

-- Seed Shifts
INSERT INTO dim_shift (shift_id, shift_name, start_time, end_time, duration_hours, planned_break_minutes, planned_production_minutes)
VALUES
    ('SHIFT-M', 'Morning Shift', '06:00:00', '14:00:00', 8.0, 45, 435),
    ('SHIFT-A', 'Afternoon Shift', '14:00:00', '22:00:00', 8.0, 45, 435),
    ('SHIFT-N', 'Night Shift', '22:00:00', '06:00:00', 8.0, 45, 435)
ON CONFLICT (shift_id) DO NOTHING;

-- Seed Downtime Reasons
INSERT INTO dim_downtime_reason (reason_id, category, reason_code, reason_name, is_planned, default_severity)
VALUES
    ('DT-01', 'PLANNED', 'PM-SCHED', 'Scheduled Preventive Maintenance', TRUE, 'INFO'),
    ('DT-02', 'PLANNED', 'TOOL-CHG', 'Scheduled Tool & Die Changeover', TRUE, 'INFO'),
    ('DT-03', 'PLANNED', 'CLEAN-CAL', 'Line Sanitation and Sensor Calibration', TRUE, 'INFO'),
    ('DT-04', 'UNPLANNED_MECHANICAL', 'HYD-FAIL', 'Hydraulic Pressure Loss / Valve Jam', FALSE, 'CRITICAL'),
    ('DT-05', 'UNPLANNED_MECHANICAL', 'SPDL-BEAR', 'Spindle Bearing Overheating & Vibration', FALSE, 'CRITICAL'),
    ('DT-06', 'UNPLANNED_MECHANICAL', 'TOOL-BRK', 'Cutter / Punch Tool Breakage', FALSE, 'WARNING'),
    ('DT-07', 'UNPLANNED_ELECTRICAL', 'DRV-FLT', 'Servo Motor Drive Inverter Fault', FALSE, 'CRITICAL'),
    ('DT-08', 'UNPLANNED_ELECTRICAL', 'SENS-DRFT', 'Optical / Laser Sensor Calibration Loss', FALSE, 'WARNING'),
    ('DT-09', 'OPERATIONAL', 'OP-WAIT', 'Operator Absence / Handover Delay', FALSE, 'WARNING'),
    ('DT-10', 'MATERIAL_SHORTAGE', 'MAT-STARVE', 'Upstream Raw Material Starvation', FALSE, 'WARNING'),
    ('DT-11', 'OPERATIONAL', 'BLK-DOWN', 'Downstream Line Blockage / Buffer Overflow', FALSE, 'WARNING'),
    ('DT-12', 'UNPLANNED_MECHANICAL', 'E-STOP', 'Emergency Stop Activated', FALSE, 'CRITICAL')
ON CONFLICT (reason_id) DO NOTHING;

-- Seed Defect Reasons
INSERT INTO dim_defect_reason (defect_id, defect_code, defect_category, defect_name, is_critical)
VALUES
    ('DEF-01', 'DIM-OOT', 'DIMENSIONAL', 'Bore Diameter Out of Tolerance', TRUE),
    ('DEF-02', 'SRF-SCR', 'SURFACE_FINISH', 'Surface Scratch / Tool Drag Mark', FALSE),
    ('DEF-03', 'WLD-POR', 'WELDING', 'Porosity in Seam Weld', TRUE),
    ('DEF-04', 'WLD-SPL', 'WELDING', 'Excessive Weld Spatter / Flash', FALSE),
    ('DEF-05', 'MET-INC', 'POROSITY', 'Internal Metal Inclusion / Void', TRUE),
    ('DEF-06', 'BURR-EDG', 'SURFACE_FINISH', 'Excess Edge Burr on Flange', FALSE),
    ('DEF-07', 'COAT-BLS', 'CONTAMINATION', 'Paint Blister / Foreign Particle Contamination', FALSE)
ON CONFLICT (defect_id) DO NOTHING;

-- Seed Date Dimension (Covering 2026-07-01 through 2026-12-31)
INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, is_weekend, week_of_year, month_num, month_name, quarter, year)
SELECT
    TO_CHAR(d, 'YYYYMMDD')::INT AS date_key,
    d::DATE AS full_date,
    EXTRACT(ISODOW FROM d)::INT AS day_of_week,
    TO_CHAR(d, 'Day') AS day_name,
    CASE WHEN EXTRACT(ISODOW FROM d) IN (6, 7) THEN TRUE ELSE FALSE END AS is_weekend,
    EXTRACT(WEEK FROM d)::INT AS week_of_year,
    EXTRACT(MONTH FROM d)::INT AS month_num,
    TO_CHAR(d, 'Month') AS month_name,
    EXTRACT(QUARTER FROM d)::INT AS quarter,
    EXTRACT(YEAR FROM d)::INT AS year
FROM generate_series('2026-07-01'::DATE, '2026-12-31'::DATE, '1 day'::INTERVAL) d
ON CONFLICT (date_key) DO NOTHING;
