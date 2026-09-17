import React, { useState, useEffect } from 'react';
import { DataQualityReport, QuarantineRecord, AuditLog } from '../types';
import { api } from '../api/client';
import { Database, ShieldCheck, AlertOctagon, History, FileText, CheckCircle2 } from 'lucide-react';

export const DataQualityView: React.FC = () => {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'QUARANTINE' | 'AUDIT'>('QUARANTINE');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rep, quar, logs] = await Promise.all([
        api.getDataQualitySummary(),
        api.listQuarantineRecords(),
        api.listAuditLogs(),
      ]);
      setReport(rep);
      setQuarantineRecords(quar);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load data quality info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Data Quality & Governance Hub</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Automated ETL pipeline validation, corrupted record quarantine storage, and batch audit tracking.
        </p>
      </div>

      {/* Summary Scorecards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Warehouse Records</span>
              <Database className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {report.warehouse_summary.total_records_stored.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Production: {report.warehouse_summary.fact_production_rows.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Pipeline Validity</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
              {report.pipeline_health.data_validity_pct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Deduped: {report.pipeline_health.rows_deduplicated.toLocaleString()} rows
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Quarantined Records</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
              {report.warehouse_summary.quarantine_rows.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Quarantine Rate: {report.pipeline_health.quarantine_rate_pct.toFixed(3)}%
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
              <span>Sensor Telemetry Readings</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {report.telemetry_metrics.total_sensor_readings.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 mt-1">
              Anomalies: {report.telemetry_metrics.sensor_anomalies_detected.toLocaleString()} ({report.telemetry_metrics.anomaly_rate_pct}%)
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('QUARANTINE')}
          className={`pb-2.5 px-3 text-xs font-semibold transition ${
            activeSubTab === 'QUARANTINE'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Quarantined Records ({quarantineRecords.length})
        </button>
        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`pb-2.5 px-3 text-xs font-semibold transition ${
            activeSubTab === 'AUDIT'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ETL Batch Audit History ({auditLogs.length})
        </button>
      </div>

      {/* Sub-tab: Quarantine Inspector */}
      {activeSubTab === 'QUARANTINE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Rejection Reason</th>
                <th className="py-3 px-4">Raw Payload Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {quarantineRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                    No quarantined records found. All data passed validation checks.
                  </td>
                </tr>
              ) : (
                quarantineRecords.map((q) => (
                  <tr key={q.quarantine_id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(q.rejected_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {q.source_stream}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-rose-400 font-bold whitespace-nowrap">
                      {q.rejection_reason}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-md truncate text-[11px]">
                      {typeof q.raw_record === 'string' ? q.raw_record : JSON.stringify(q.raw_record)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab: ETL Audit Logs */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-medium uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pipeline</th>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Extracted</th>
                <th className="py-3 px-4">Loaded</th>
                <th className="py-3 px-4">Deduplicated</th>
                <th className="py-3 px-4">Rejected</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.job_id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-sans font-semibold text-white">{log.pipeline_name}</td>
                  <td className="py-2.5 px-4 text-sky-400 text-[11px]">{log.batch_identifier}</td>
                  <td className="py-2.5 px-4 text-slate-300">{log.rows_extracted.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-emerald-400 font-bold">{log.rows_loaded.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-amber-400">{log.rows_deduplicated.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-rose-400">{log.rows_rejected.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-slate-400">{log.execution_time_seconds || 0}s</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
