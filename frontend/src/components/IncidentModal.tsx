import React, { useState, useEffect } from 'react';
import { Incident, User } from '../types';
import { api } from '../api/client';
import { X, CheckCircle2, UserCheck, Search, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

interface IncidentModalProps {
  incident: Incident;
  mode: 'VIEW' | 'ACKNOWLEDGE' | 'ASSIGN' | 'INVESTIGATE' | 'RESOLVE';
  onClose: () => void;
  onSuccess: () => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  incident,
  mode: initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState(initialMode);
  const [notes, setNotes] = useState('');
  const [rootCause, setRootCause] = useState(incident.root_cause || '');
  const [correctiveAction, setCorrectiveAction] = useState(incident.corrective_action || '');
  const [assignedTo, setAssignedTo] = useState(incident.assigned_to || '');
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.listUsers()
      .then(setUsers)
      .catch((err) => console.warn('Could not load assignable users:', err));
  }, []);

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.acknowledgeIncident(incident.incident_id, notes);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to acknowledge incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignedTo) {
      setErrorMsg('Please select an engineer to assign');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.assignIncident(incident.incident_id, assignedTo);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvestigate = async () => {
    if (!rootCause.trim()) {
      setErrorMsg('Please document preliminary root cause findings');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.investigateIncident(incident.incident_id, rootCause, notes);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update investigation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!rootCause.trim()) {
      setErrorMsg('Root Cause is required to resolve this incident');
      return;
    }
    if (!correctiveAction.trim()) {
      setErrorMsg('Corrective Action is required to resolve this incident');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.resolveIncident(incident.incident_id, rootCause, correctiveAction, notes);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase ${getSeverityBadge(incident.severity)}`}>
              {incident.severity}
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">{incident.rule_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Core Telemetry & Status Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Machine ID</div>
              <div className="text-sm font-bold text-white font-mono">{incident.machine_id}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Observed Value</div>
              <div className="text-sm font-bold text-rose-400 font-mono">
                {incident.observed_value}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Threshold</div>
              <div className="text-sm font-bold text-slate-300 font-mono">
                {incident.threshold_value}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Current Status</div>
              <div className="text-sm font-bold text-sky-400 font-mono">{incident.status}</div>
            </div>
          </div>

          {/* Workflow Tabs */}
          <div className="flex border-b border-slate-800 space-x-2">
            <button
              onClick={() => setMode('VIEW')}
              className={`pb-2.5 px-3 text-sm font-medium transition ${
                mode === 'VIEW' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview & Audit
            </button>
            {incident.status === 'OPEN' && (
              <button
                onClick={() => setMode('ACKNOWLEDGE')}
                className={`pb-2.5 px-3 text-sm font-medium transition ${
                  mode === 'ACKNOWLEDGE' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Acknowledge
              </button>
            )}
            {incident.status !== 'RESOLVED' && (
              <>
                <button
                  onClick={() => setMode('ASSIGN')}
                  className={`pb-2.5 px-3 text-sm font-medium transition ${
                    mode === 'ASSIGN' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Assign Engineer
                </button>
                <button
                  onClick={() => setMode('INVESTIGATE')}
                  className={`pb-2.5 px-3 text-sm font-medium transition ${
                    mode === 'INVESTIGATE' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Investigate (5-Whys)
                </button>
                <button
                  onClick={() => setMode('RESOLVE')}
                  className={`pb-2.5 px-3 text-sm font-medium transition ${
                    mode === 'RESOLVE' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Resolve Incident
                </button>
              </>
            )}
          </div>

          {/* Dynamic Content by Mode */}
          {mode === 'VIEW' && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Timeline & Ownership</div>
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Triggered At:</span>
                    <span>{new Date(incident.created_at).toLocaleString()}</span>
                  </div>
                  {incident.acknowledged_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Acknowledged:</span>
                      <span>{new Date(incident.acknowledged_at).toLocaleString()} by {incident.acknowledged_by_name || 'Operator'}</span>
                    </div>
                  )}
                  {incident.assignee_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Engineer:</span>
                      <span className="text-sky-400 font-semibold">{incident.assignee_name}</span>
                    </div>
                  )}
                  {incident.resolved_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolved At:</span>
                      <span className="text-emerald-400 font-semibold">{new Date(incident.resolved_at).toLocaleString()} by {incident.resolved_by_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {incident.root_cause && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause Analysis</div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-200 whitespace-pre-wrap">
                    {incident.root_cause}
                  </div>
                </div>
              )}

              {incident.corrective_action && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Corrective Action Taken</div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-200 whitespace-pre-wrap">
                    {incident.corrective_action}
                  </div>
                </div>
              )}

              {incident.resolution_notes && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Investigation Notes & Log</div>
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-400 whitespace-pre-wrap text-xs font-mono">
                    {incident.resolution_notes}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'ACKNOWLEDGE' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Acknowledge this alert to signal that operations are aware and taking responsibility.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Operator Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="e.g. Alert noted, dispatching shift technician to Press 01..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAcknowledge}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold transition flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming...' : 'Confirm Acknowledgement'}</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'ASSIGN' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Assign a Reliability Engineer or Maintenance Technician to investigate and lead resolution.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Assignee</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.role}) - @{u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAssign}
                  className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition flex items-center space-x-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Assigning...' : 'Assign Owner'}</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'INVESTIGATE' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Record diagnostic findings, telemetry inspection, and root cause hypothesis.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Root Cause Diagnostics (5-Whys Analysis) *
                </label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-sans"
                  placeholder="1. Why: High vibration RMS detected. 2. Why: Main spindle bearing dry. 3. Why: Automatic lubrication line clogged..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Investigation Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Replaced auxiliary oil filter, monitoring bearing temperature..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleInvestigate}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Update Investigation'}</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'RESOLVE' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Close this incident by documenting permanent root causes and corrective actions to prevent recurrence.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Confirmed Root Cause *
                </label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Root cause validated during machine physical inspection..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Corrective & Preventive Action (CAPA) *
                </label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Permanent action taken: replaced seals, adjusted lubrication schedule, calibrated telemetry sensor..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Closing Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Machine restarted and operating at nominal cycle time."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResolve}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Closing Incident...' : 'Resolve & Close Incident'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
