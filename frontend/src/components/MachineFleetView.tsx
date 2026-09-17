import React, { useState, useEffect } from 'react';
import { Machine } from '../types';
import { api } from '../api/client';
import { Cpu, Activity, Thermometer, Gauge, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const MachineFleetView: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      const data = await api.listMachines();
      setMachines(data);
    } catch (err) {
      console.error('Failed to fetch machine fleet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleSelectMachine = async (m: Machine) => {
    setSelectedMachine(m);
    try {
      const history = await api.getMachineTelemetry(m.machine_id);
      setTelemetryHistory(history);
    } catch (err) {
      console.warn('Could not load telemetry history:', err);
    }
  };

  const filteredMachines = machines.filter((m) => {
    if (selectedFactory !== 'ALL' && m.factory_id !== selectedFactory) return false;
    return true;
  });

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'DOWNTIME':
        return 'border-rose-500/40 bg-rose-500/5';
      case 'WARNING':
        return 'border-amber-500/40 bg-amber-500/5';
      default:
        return 'border-slate-800 bg-slate-900/80';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DOWNTIME':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Factory Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Machine Fleet & Sensor Telemetry</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status, vibration RMS, temperature, and pressure monitoring across 3 plants.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Factory:</span>
          <select
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Factories (3 Plants)</option>
            <option value="FACT-01">Detroit Automotive Plant 1</option>
            <option value="FACT-02">Stuttgart Precision Works</option>
            <option value="FACT-03">Yokohama Advanced Mobility</option>
          </select>
        </div>
      </div>

      {/* Grid of Machines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMachines.map((m) => (
          <div
            key={m.machine_id}
            onClick={() => handleSelectMachine(m)}
            className={`p-4 rounded-xl border ${getStatusBorder(m.machine_status)} hover:border-sky-500/50 cursor-pointer transition-all shadow-sm`}
          >
            {/* Top Bar */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-sky-400">{m.machine_id}</span>
                  {m.is_bottleneck && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Bottleneck
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mt-1 line-clamp-1">{m.machine_name}</h3>
                <div className="text-[11px] text-slate-400">{m.line_name}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(m.machine_status)}`}>
                {m.machine_status}
              </span>
            </div>

            {/* Live Sensor Readings */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
              <div>
                <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400">
                  <Activity className="w-3 h-3 text-sky-400" />
                  <span>Vibration</span>
                </div>
                <div className={`text-xs font-bold font-mono mt-1 ${m.current_vibration_rms > 4.5 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {m.current_vibration_rms.toFixed(2)} <span className="text-[9px] font-normal text-slate-500">mm/s</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  <span>Temp</span>
                </div>
                <div className={`text-xs font-bold font-mono mt-1 ${m.current_temperature_c > 85.0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {m.current_temperature_c.toFixed(1)} <span className="text-[9px] font-normal text-slate-500">°C</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400">
                  <Gauge className="w-3 h-3 text-teal-400" />
                  <span>Pressure</span>
                </div>
                <div className="text-xs font-bold font-mono mt-1 text-slate-200">
                  {m.current_pressure_bar.toFixed(1)} <span className="text-[9px] font-normal text-slate-500">bar</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
              <span>Ideal Cycle Time:</span>
              <span className="font-mono text-slate-200 font-semibold">{m.ideal_cycle_time_sec} sec</span>
            </div>
          </div>
        ))}
      </div>

      {/* Telemetry Detail Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedMachine.machine_name} ({selectedMachine.machine_id})</h3>
                <p className="text-xs text-slate-400">{selectedMachine.factory_name} — {selectedMachine.line_name}</p>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase">Recent High-Frequency Telemetry History</div>
              <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Vibration (mm/s)</th>
                      <th className="py-2 px-3">Temperature (°C)</th>
                      <th className="py-2 px-3">Pressure (bar)</th>
                      <th className="py-2 px-3">Motor Power (kW)</th>
                      <th className="py-2 px-3">Anomaly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {telemetryHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                          No telemetry records available for this unit.
                        </td>
                      </tr>
                    ) : (
                      telemetryHistory.map((t, idx) => (
                        <tr key={idx} className={t.is_anomaly ? 'bg-rose-500/10' : ''}>
                          <td className="py-1.5 px-3 text-slate-400">{new Date(t.recorded_at).toLocaleTimeString()}</td>
                          <td className={`py-1.5 px-3 ${t.vibration_rms > 4.5 ? 'text-rose-400 font-bold' : ''}`}>{t.vibration_rms}</td>
                          <td className={`py-1.5 px-3 ${t.temperature_c > 85.0 ? 'text-amber-400 font-bold' : ''}`}>{t.temperature_c}</td>
                          <td className="py-1.5 px-3">{t.pressure_bar}</td>
                          <td className="py-1.5 px-3">{t.power_kw}</td>
                          <td className="py-1.5 px-3">
                            {t.is_anomaly ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">YES</span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">No</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
