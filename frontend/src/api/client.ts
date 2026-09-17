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

import {
  mockUsers,
  mockKpis,
  mockMachines,
  mockIncidents,
  mockRules,
  mockDataQuality,
  mockQuarantine,
  mockAuditLogs
} from './mockData';

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
  async login(username: string, password: string): Promise<{ access_token: string; user_id: string; username: string; role: string; full_name: string }> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      return await handleResponse(res);
    } catch {
      // Fallback to local mock authentication
      const user = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || mockUsers[0];
      return {
        access_token: `mock_jwt_token_${user.role.toLowerCase()}`,
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      };
    }
  },

  async getMe(): Promise<User> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/me`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockUsers[0];
    }
  },

  async listUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/users`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockUsers;
    }
  },

  // KPIs
  async getKpiSummary(): Promise<KpiSummary> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/summary`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockKpis;
    }
  },

  async getMachineOee(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/oee`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockMachines.map(m => ({
        machine_id: m.machine_id,
        machine_name: m.machine_name,
        oee_pct: (Math.random() * 15 + 75).toFixed(1),
        availability_pct: (Math.random() * 10 + 85).toFixed(1),
        performance_pct: (Math.random() * 10 + 88).toFixed(1),
        quality_pct: (Math.random() * 5 + 95).toFixed(1),
      }));
    }
  },

  async getReliabilityKpis(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/reliability`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return [
        { metric: 'Mean Time Between Failures (MTBF)', value: '14.2 hrs', change: '+12% vs last week' },
        { metric: 'Mean Time To Repair (MTTR)', value: '28.5 mins', change: '-8% vs last week' },
        { metric: 'Unplanned Downtime Rate', value: '3.4%', change: 'Normal' },
      ];
    }
  },

  async getDowntimePareto(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/kpis/pareto`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return [
        { reason: 'Spindle Bearing Wear', duration_min: 840, pct: 34.2, cum_pct: 34.2 },
        { reason: 'Coolant Flow Restriction', duration_min: 520, pct: 21.2, cum_pct: 55.4 },
        { reason: 'Pneumatic Pressure Drop', duration_min: 380, pct: 15.5, cum_pct: 70.9 },
        { reason: 'Feeder Jam / Misalignment', duration_min: 290, pct: 11.8, cum_pct: 82.7 },
        { reason: 'Tooling Calibration Offset', duration_min: 210, pct: 8.6, cum_pct: 91.3 },
      ];
    }
  },

  // Machines
  async listMachines(): Promise<Machine[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/machines`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockMachines;
    }
  },

  async getMachineTelemetry(machineId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/machines/${machineId}/telemetry`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return Array.from({ length: 15 }, (_, i) => ({
        timestamp: new Date(Date.now() - (15 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        vibration: (2.0 + Math.random() * 1.5).toFixed(2),
        temperature: (65 + Math.random() * 8).toFixed(1),
        pressure: (5.8 + Math.random() * 0.5).toFixed(2),
      }));
    }
  },

  // Incidents
  async listIncidents(params: { status?: string; severity?: string; machineId?: string } = {}): Promise<Incident[]> {
    try {
      const query = new URLSearchParams();
      if (params.status && params.status !== 'ALL') query.append('status', params.status);
      if (params.severity && params.severity !== 'ALL') query.append('severity', params.severity);
      if (params.machineId) query.append('machine_id', params.machineId);

      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents?${query.toString()}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      let filtered = [...mockIncidents];
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter(i => i.status === params.status);
      }
      if (params.severity && params.severity !== 'ALL') {
        filtered = filtered.filter(i => i.severity === params.severity);
      }
      if (params.machineId) {
        filtered = filtered.filter(i => i.machine_id === params.machineId);
      }
      return filtered;
    }
  },

  async getIncidentStats(): Promise<IncidentStats> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/stats`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return {
        total_open: mockIncidents.filter(i => i.status === 'OPEN').length,
        total_acknowledged: mockIncidents.filter(i => i.status === 'ACKNOWLEDGED').length,
        total_investigating: mockIncidents.filter(i => i.status === 'INVESTIGATING').length,
        total_resolved: mockIncidents.filter(i => i.status === 'RESOLVED').length,
        critical_count: mockIncidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
        warning_count: mockIncidents.filter(i => i.severity === 'WARNING' && i.status !== 'RESOLVED').length,
      };
    }
  },

  async acknowledgeIncident(incidentId: string, notes?: string): Promise<Incident> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/acknowledge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
      });
      return await handleResponse(res);
    } catch {
      const inc = mockIncidents.find(i => i.incident_id === incidentId);
      if (inc) {
        inc.status = 'ACKNOWLEDGED';
        inc.acknowledged_at = new Date().toISOString();
        inc.acknowledged_by_name = 'Shift Supervisor (Alpha)';
        inc.updated_at = new Date().toISOString();
        return { ...inc };
      }
      throw new Error('Incident not found');
    }
  },

  async assignIncident(incidentId: string, assignedTo: string): Promise<Incident> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      return await handleResponse(res);
    } catch {
      const inc = mockIncidents.find(i => i.incident_id === incidentId);
      if (inc) {
        inc.assigned_to = assignedTo;
        inc.assignee_name = mockUsers.find(u => u.user_id === assignedTo)?.full_name || 'Assigned Engineer';
        inc.updated_at = new Date().toISOString();
        return { ...inc };
      }
      throw new Error('Incident not found');
    }
  },

  async investigateIncident(incidentId: string, rootCause: string, notes?: string): Promise<Incident> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/investigate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ root_cause: rootCause, notes }),
      });
      return await handleResponse(res);
    } catch {
      const inc = mockIncidents.find(i => i.incident_id === incidentId);
      if (inc) {
        inc.status = 'INVESTIGATING';
        inc.root_cause = rootCause;
        inc.updated_at = new Date().toISOString();
        return { ...inc };
      }
      throw new Error('Incident not found');
    }
  },

  async resolveIncident(incidentId: string, rootCause: string, correctiveAction: string, resolutionNotes?: string): Promise<Incident> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          root_cause: rootCause,
          corrective_action: correctiveAction,
          resolution_notes: resolutionNotes,
        }),
      });
      return await handleResponse(res);
    } catch {
      const inc = mockIncidents.find(i => i.incident_id === incidentId);
      if (inc) {
        inc.status = 'RESOLVED';
        inc.root_cause = rootCause;
        inc.corrective_action = correctiveAction;
        inc.resolution_notes = resolutionNotes;
        inc.resolved_at = new Date().toISOString();
        inc.resolved_by_name = 'Lead Reliability Engineer';
        inc.updated_at = new Date().toISOString();
        return { ...inc };
      }
      throw new Error('Incident not found');
    }
  },

  // Alert Rules
  async listRules(): Promise<AlertRule[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/rules`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockRules;
    }
  },

  async updateRule(ruleId: string, data: Partial<AlertRule>): Promise<AlertRule> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/rules/${ruleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      const r = mockRules.find(x => x.rule_id === ruleId);
      if (r) {
        Object.assign(r, data);
        return { ...r };
      }
      throw new Error('Rule not found');
    }
  },

  async triggerAlertEvaluation(): Promise<{ incidents_created: number; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/alerts/evaluate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return { incidents_created: 1, message: 'Simulated alert evaluation evaluated rules across latest facts.' };
    }
  },

  // Data Quality & Governance
  async getDataQualitySummary(): Promise<DataQualityReport> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/summary`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockDataQuality;
    }
  },

  async listQuarantineRecords(stream?: string): Promise<QuarantineRecord[]> {
    try {
      const query = stream ? `?stream=${stream}` : '';
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/quarantine${query}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockQuarantine;
    }
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${API_PREFIX}/data-quality/audit-logs`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(res);
    } catch {
      return mockAuditLogs;
    }
  },
};
