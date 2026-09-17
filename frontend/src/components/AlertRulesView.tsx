import React, { useState, useEffect } from 'react';
import { AlertRule } from '../types';
import { api } from '../api/client';
import { Sliders, Plus, CheckCircle2, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

export const AlertRulesView: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    rule_name: '',
    metric_name: 'OEE',
    comparison_operator: '<',
    threshold_value: 0.65,
    severity: 'WARNING',
    is_active: true,
    description: '',
  });

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const data = await api.listRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      const updated = await api.updateRule(rule.rule_id, { is_active: !rule.is_active });
      setRules(rules.map((r) => (r.rule_id === rule.rule_id ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Alert Rules & Anomaly Triggers</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated anomaly thresholds for OEE degradation, micro-stoppages, defect rates, and telemetry spikes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Threshold Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Active</th>
              <th className="py-3 px-4">Rule Name</th>
              <th className="py-3 px-4">Target Metric</th>
              <th className="py-3 px-4">Condition & Threshold</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {rules.map((rule) => (
              <tr key={rule.rule_id} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    onChange={() => handleToggleRule(rule)}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-4 font-semibold text-white">{rule.rule_name}</td>
                <td className="py-3 px-4 font-mono text-sky-400 font-bold">{rule.metric_name}</td>
                <td className="py-3 px-4 font-mono font-bold">
                  <span className="text-slate-400 mr-1.5">{rule.comparison_operator}</span>
                  <span className="text-rose-400">{rule.threshold_value}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadge(rule.severity)}`}>
                    {rule.severity}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{rule.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for adding rules */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create Operational Alert Rule</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  placeholder="e.g. Spindle Vibration Warning"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Metric</label>
                  <select
                    value={newRule.metric_name}
                    onChange={(e) => setNewRule({ ...newRule, metric_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  >
                    <option value="OEE">OEE</option>
                    <option value="DOWNTIME_MINUTES">Downtime Minutes</option>
                    <option value="REJECTION_RATE">Rejection Rate (%)</option>
                    <option value="VIBRATION_RMS">Vibration RMS (mm/s)</option>
                    <option value="TEMPERATURE_C">Temperature (°C)</option>
                    <option value="TARGET_ACHIEVEMENT">Target Achievement (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Operator</label>
                  <select
                    value={newRule.comparison_operator}
                    onChange={(e) => setNewRule({ ...newRule, comparison_operator: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  >
                    <option value="<">&lt; (Less than)</option>
                    <option value=">">&gt; (Greater than)</option>
                    <option value="<=">&le; (Less than or equal)</option>
                    <option value=">=">&ge; (Greater than or equal)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Threshold Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRule.threshold_value}
                    onChange={(e) => setNewRule({ ...newRule, threshold_value: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Severity</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="WARNING">Warning</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  placeholder="Rationale and response guide for shift operators..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded bg-slate-800 text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newRule.rule_name) return;
                  await api.updateRule('new', newRule as any).catch(() => {});
                  setShowAddModal(false);
                  fetchRules();
                }}
                className="px-4 py-2 rounded bg-sky-500 text-slate-950 font-bold text-xs"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
