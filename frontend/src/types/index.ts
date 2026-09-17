export type UserRole = 'ADMIN' | 'ENGINEER' | 'SUPERVISOR' | 'OPERATOR';

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Incident {
  incident_id: string;
  alert_id?: string;
  machine_id: string;
  rule_name: string;
  metric_name: string;
  observed_value: number;
  threshold_value: number;
  severity: AlertSeverity;
  status: IncidentStatus;
  assigned_to?: string;
  assignee_name?: string;
  acknowledged_at?: string;
  acknowledged_by_name?: string;
  root_cause?: string;
  corrective_action?: string;
  resolved_at?: string;
  resolved_by_name?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentStats {
  total_open: number;
  total_acknowledged: number;
  total_investigating: number;
  total_resolved: number;
  critical_count: number;
  warning_count: number;
}

export interface KpiSummary {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  total_production: number;
  good_units: number;
  scrap_units: number;
  rejection_rate_pct: number;
  total_downtime_minutes: number;
  active_machines_count: number;
  open_incidents_count: number;
}

export interface Machine {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  ideal_cycle_time_sec: number;
  is_bottleneck: boolean;
  line_id: string;
  line_name: string;
  factory_id: string;
  factory_name: string;
  current_vibration_rms: number;
  current_temperature_c: number;
  current_pressure_bar: number;
  has_anomaly: boolean;
  machine_status: 'RUNNING' | 'WARNING' | 'DOWNTIME';
}

export interface AlertRule {
  rule_id: string;
  rule_name: string;
  metric_name: string;
  comparison_operator: string;
  threshold_value: number;
  severity: AlertSeverity;
  machine_type?: string;
  is_active: boolean;
  description?: string;
}

export interface DataQualityReport {
  warehouse_summary: {
    total_records_stored: number;
    fact_production_rows: number;
    fact_sensor_telemetry_rows: number;
    fact_downtime_rows: number;
    fact_quality_rows: number;
    quarantine_rows: number;
  };
  pipeline_health: {
    rows_extracted: number;
    rows_loaded: number;
    rows_deduplicated: number;
    rows_rejected: number;
    data_validity_pct: number;
    quarantine_rate_pct: number;
  };
  telemetry_metrics: {
    total_sensor_readings: number;
    sensor_anomalies_detected: number;
    anomaly_rate_pct: number;
  };
  operational_governance: {
    open_incidents_count: number;
    resolved_incidents_count: number;
    overall_data_health: string;
  };
}

export interface QuarantineRecord {
  quarantine_id: string;
  batch_identifier: string;
  source_stream: string;
  raw_record: Record<string, any>;
  rejection_reason: string;
  rejected_at: string;
}

export interface AuditLog {
  job_id: string;
  pipeline_name: string;
  batch_identifier: string;
  start_time: string;
  end_time?: string;
  rows_extracted: number;
  rows_loaded: number;
  rows_rejected: number;
  rows_deduplicated: number;
  status: string;
  execution_time_seconds?: number;
}
