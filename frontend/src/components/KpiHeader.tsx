import React from 'react';
import { KpiSummary } from '../types';
import { Gauge, CheckCircle2, Clock, AlertOctagon, TrendingUp, Cpu } from 'lucide-react';

interface KpiHeaderProps {
  kpis: KpiSummary | null;
  isLoading: boolean;
}

export const KpiHeader: React.FC<KpiHeaderProps> = ({ kpis, isLoading }) => {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;
  
  const getOeeColor = (oee: number) => {
    if (oee >= 0.85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (oee >= 0.65) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Global OEE Card */}
      <div className={`p-4 rounded-xl border ${getOeeColor(kpis.oee)} backdrop-blur transition-all shadow-sm`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Overall OEE</span>
          <Gauge className="w-4 h-4" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{formatPct(kpis.oee)}</div>
        <div className="text-xs text-slate-400 mt-1">World Class: ≥ 85.0%</div>
      </div>

      {/* 2. Availability */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Availability</span>
          <Clock className="w-4 h-4 text-sky-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white">{formatPct(kpis.availability)}</div>
        <div className="text-xs text-slate-400 mt-1">Operating / Planned Time</div>
      </div>

      {/* 3. Performance */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Performance</span>
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white">{formatPct(kpis.performance)}</div>
        <div className="text-xs text-slate-400 mt-1">Speed & Cycle Adherence</div>
      </div>

      {/* 4. Quality */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quality Rate</span>
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white">{formatPct(kpis.quality)}</div>
        <div className="text-xs text-slate-400 mt-1">Rejection: {kpis.rejection_rate_pct.toFixed(2)}%</div>
      </div>

      {/* 5. Production Output */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Output</span>
          <Cpu className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white">
          {kpis.total_production.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-1">Scrap: {kpis.scrap_units.toLocaleString()} units</div>
      </div>

      {/* 6. Downtime & Incidents */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lost Downtime</span>
          <AlertOctagon className="w-4 h-4 text-rose-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-white">
          {(kpis.total_downtime_minutes / 60.0).toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
        </div>
        <div className="text-xs text-rose-400 mt-1 font-medium">{kpis.open_incidents_count} Open Alerts</div>
      </div>
    </div>
  );
};
