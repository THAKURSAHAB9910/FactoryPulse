import React, { useState } from 'react';
import { BarChart3, ExternalLink, Activity, Cpu, Layers, CheckCircle2, ShieldAlert } from 'lucide-react';

export const SupersetLauncherView: React.FC = () => {
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const supersetBaseUrl = 'http://localhost:8088';

  const dashboards = [
    {
      id: 'executive-factory-performance',
      title: 'Executive Factory Performance',
      description: 'Enterprise OEE gauges, multi-plant availability comparisons, and daily production target compliance.',
      icon: Activity,
      color: 'from-sky-500 to-blue-600',
      slug: 'executive-factory-performance',
      metrics: ['Global OEE Gauge', 'Availability %', 'Performance %', 'Quality Rate %']
    },
    {
      id: 'machine-monitoring-telemetry',
      title: 'Machine Monitoring & Telemetry',
      description: 'High-frequency telemetry stream with vibration RMS, temperature curves, and bearing anomaly heatmaps.',
      icon: Cpu,
      color: 'from-purple-500 to-indigo-600',
      slug: 'machine-monitoring-telemetry',
      metrics: ['Vibration Spectrum', 'Spindle Temp °C', 'Accumulator Pressure', 'RPM Anomalies']
    },
    {
      id: 'shift-line-analysis',
      title: 'Shift & Production Line Analysis',
      description: 'Shift-by-shift output breakdown, bottleneck machine detection, and line capacity utilization.',
      icon: Layers,
      color: 'from-emerald-500 to-teal-600',
      slug: 'shift-line-analysis',
      metrics: ['Units Per Hour', 'Shift Comparison', 'Bottleneck Cycle Delays', 'Energy kWh']
    },
    {
      id: 'quality-defect-pareto',
      title: 'Quality & Defect Pareto',
      description: 'Defect reason classification, scrap financial losses, rework tracking, and first-pass yield.',
      icon: CheckCircle2,
      color: 'from-amber-500 to-orange-600',
      slug: 'quality-defect-pareto',
      metrics: ['Defect Pareto Chart', 'Scrap Cost USD', 'Rework Ratio', 'Critical Defects']
    },
    {
      id: 'active-alerts-downtime-hub',
      title: 'Active Alerts & Downtime Incident Hub',
      description: 'Top downtime categories Pareto, Mean Time Between Failures (MTBF), MTTR, and critical alarms.',
      icon: ShieldAlert,
      color: 'from-rose-500 to-red-600',
      slug: 'active-alerts-downtime-hub',
      metrics: ['80/20 Downtime Pareto', 'MTBF Hours', 'MTTR Hours', 'Micro-Stoppages']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Apache Superset 3.0 BI Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5 pre-configured manufacturing dashboards with native multi-dimensional cross filters (Factory, Line, Machine, Product, Shift, Date).
          </p>
        </div>

        <a
          href={supersetBaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow transition"
        >
          <span>Open Apache Superset Server</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map((dash) => {
          const Icon = dash.icon;
          return (
            <div
              key={dash.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-sky-500/40 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dash.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{dash.title}</h3>
                    <span className="text-[10px] font-mono text-sky-400">/{dash.slug}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {dash.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {dash.metrics.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 text-[10px] border border-slate-800 font-medium">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDashboard(dash.slug)}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                >
                  Preview in Viewport
                </button>
                <a
                  href={`${supersetBaseUrl}/superset/dashboard/${dash.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition"
                >
                  <span>Launch Direct</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Iframe Preview Modal */}
      {selectedDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-white">Superset Dashboard Viewport</span>
                <span className="text-xs font-mono text-sky-400">/{selectedDashboard}</span>
              </div>
              <div className="flex items-center space-x-3">
                <a
                  href={`${supersetBaseUrl}/superset/dashboard/${selectedDashboard}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:underline flex items-center space-x-1"
                >
                  <span>Open Fullscreen</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setSelectedDashboard(null)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950">
              <iframe
                src={`${supersetBaseUrl}/superset/dashboard/${selectedDashboard}/?standalone=true`}
                className="w-full h-full border-0"
                title="Superset Dashboard Viewport"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
