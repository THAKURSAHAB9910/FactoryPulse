import React, { useState, useMemo } from 'react';
import { Incident, IncidentStats } from '../types';
import { IncidentModal } from './IncidentModal';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  UserPlus, 
  Sliders, 
  Wrench, 
  Eye, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { api } from '../api/client';

interface IncidentConsoleProps {
  incidents: Incident[];
  stats: IncidentStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const IncidentConsole: React.FC<IncidentConsoleProps> = ({
  incidents,
  stats,
  isLoading,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [modalMode, setModalMode] = useState<'VIEW' | 'ACKNOWLEDGE' | 'ASSIGN' | 'INVESTIGATE' | 'RESOLVE'>('VIEW');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalMessage, setEvalMessage] = useState<string | null>(null);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchMch = inc.machine_id.toLowerCase().includes(term);
        const matchRule = inc.rule_name.toLowerCase().includes(term);
        const matchMetric = inc.metric_name.toLowerCase().includes(term);
        const matchCause = (inc.root_cause || '').toLowerCase().includes(term);
        if (!matchMch && !matchRule && !matchMetric && !matchCause) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, severityFilter, searchTerm]);

  const handleOpenAction = (inc: Incident, mode: 'VIEW' | 'ACKNOWLEDGE' | 'ASSIGN' | 'INVESTIGATE' | 'RESOLVE') => {
    setSelectedIncident(inc);
    setModalMode(mode);
  };

  const handleManualRuleEvaluation = async () => {
    setIsEvaluating(true);
    setEvalMessage(null);
    try {
      const res = await api.triggerAlertEvaluation();
      setEvalMessage(res.message);
      onRefresh();
      setTimeout(() => setEvalMessage(null), 5000);
    } catch (err: any) {
      setEvalMessage(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'OPEN':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'INVESTIGATING':
        return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Manual Evaluator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Operational Incident Console</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {filteredIncidents.length} events
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time shop floor alerts, downtime incident routing, and 5-Whys CAPA resolution workflow.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handleManualRuleEvaluation}
            disabled={isEvaluating}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
            title="Evaluate active rules against warehouse facts now"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating Rules...' : 'Trigger Rule Engine'}</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {evalMessage && (
        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs flex items-center justify-between">
          <span>{evalMessage}</span>
          <button onClick={() => setEvalMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'All Incidents', count: incidents.length },
              { id: 'OPEN', label: 'Open', count: stats?.total_open || 0 },
              { id: 'ACKNOWLEDGED', label: 'Acknowledged', count: stats?.total_acknowledged || 0 },
              { id: 'INVESTIGATING', label: 'Investigating', count: stats?.total_investigating || 0 },
              { id: 'RESOLVED', label: 'Resolved', count: stats?.total_resolved || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab.id
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? 'bg-slate-950 text-white font-mono' : 'bg-slate-800 text-slate-400 font-mono'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by machine ID (e.g. MCH-01-01), metric name, rule, or root cause keywords..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Incident Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Machine & Rule</th>
                <th className="py-3 px-4">Observed / Threshold</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Triggered At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No incidents matching the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr key={inc.incident_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getSeverityPill(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{inc.rule_name}</div>
                      <div className="text-[11px] font-mono text-sky-400">{inc.machine_id}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono">
                      <span className="text-rose-400 font-bold">{inc.observed_value}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-slate-400">{inc.threshold_value}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({inc.metric_name})</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {inc.assignee_name ? (
                        <span className="text-slate-200 font-medium">{inc.assignee_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <div className="text-[10px] text-slate-500">{new Date(inc.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenAction(inc, 'VIEW')}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {inc.status === 'OPEN' && (
                          <button
                            onClick={() => handleOpenAction(inc, 'ACKNOWLEDGE')}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-medium transition"
                            title="Acknowledge Alert"
                          >
                            Ack
                          </button>
                        )}
                        {inc.status !== 'RESOLVED' && (
                          <>
                            <button
                              onClick={() => handleOpenAction(inc, 'ASSIGN')}
                              className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-medium transition"
                              title="Assign Engineer"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleOpenAction(inc, 'RESOLVE')}
                              className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition"
                              title="Resolve & Close"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action / Detail Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={selectedIncident}
          mode={modalMode}
          onClose={() => setSelectedIncident(null)}
          onSuccess={() => {
            setSelectedIncident(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
