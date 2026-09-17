import {
  User,
  Incident,
  IncidentStats,
  KpiSummary,
  Machine,
  AlertRule,
  DataQualityReport,
  QuarantineRecord,
  AuditLog
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('fp_auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      // Clear expired token
      localStorage.removeItem('fp_auth_token');
      localStorage.removeItem('fp_user');
    }
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password: string):Promise<{ access_token: string; user_id: string; username: string; role: string; full_name: string }> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async listUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // KPIs
  async getKpiSummary(): Promise<KpiSummary> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMachineOee(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/oee`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getReliabilityKpis(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/reliability`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDowntimePareto(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/pareto`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Machines
  async listMachines(): Promise<Machine[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/machines`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMachineTelemetry(machineId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/machines/${machineId}/telemetry`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Incidents
  async listIncidents(params: { status?: string; severity?: string; machineId?: string } = {}): Promise<Incident[]> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.severity && params.severity !== 'ALL') query.append('severity', params.severity);
    if (params.machineId) query.append('machine_id', params.machineId);

    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getIncidentStats(): Promise<IncidentStats> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async acknowledgeIncident(incidentId: string, notes?: string): Promise<Incident> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/acknowledge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    return handleResponse(res);
  },

  async assignIncident(incidentId: string, assignedTo: string): Promise<Incident> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
    return handleResponse(res);
  },

  async investigateIncident(incidentId: string, rootCause: string, notes?: string): Promise<Incident> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/investigate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ root_cause: rootCause, notes }),
    });
    return handleResponse(res);
  },

  async resolveIncident(incidentId: string, rootCause: string, correctiveAction: string, resolutionNotes?: string): Promise<Incident> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        root_cause: rootCause,
        corrective_action: correctiveAction,
        resolution_notes: resolutionNotes,
      }),
    });
    return handleResponse(res);
  },

  // Alert Rules
  async listRules(): Promise<AlertRule[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/rules`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateRule(ruleId: string, data: Partial<AlertRule>): Promise<AlertRule> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/rules/${ruleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async triggerAlertEvaluation(): Promise<{ incidents_created: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/alerts/evaluate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Data Quality & Governance
  async getDataQualitySummary(): Promise<DataQualityReport> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async listQuarantineRecords(stream?: string): Promise<QuarantineRecord[]> {
    const query = stream ? `?stream=${stream}` : '';
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/quarantine${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/audit-logs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
