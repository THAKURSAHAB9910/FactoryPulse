import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { KpiHeader } from './components/KpiHeader';
import { IncidentConsole } from './components/IncidentConsole';
import { MachineFleetView } from './components/MachineFleetView';
import { AlertRulesView } from './components/AlertRulesView';
import { DataQualityView } from './components/DataQualityView';
import { SupersetLauncherView } from './components/SupersetLauncherView';
import { LoginModal } from './components/LoginModal';
import { useWebSocket } from './context/WebSocketContext';
import { useAuth } from './context/AuthContext';
import { Incident, IncidentStats, KpiSummary } from './types';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('incidents');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { lastMessage } = useWebSocket();
  const { isAuthenticated } = useAuth();

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kpiData, incidentList, incidentStats] = await Promise.all([
        api.getKpiSummary().catch(() => null),
        api.listIncidents().catch(() => []),
        api.getIncidentStats().catch(() => null),
      ]);
      if (kpiData) setKpis(kpiData);
      setIncidents(incidentList);
      if (incidentStats) setStats(incidentStats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Handle incoming real-time WebSocket events
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'INCIDENT_UPDATED' || lastMessage.type === 'ALERT_TRIGGERED') {
        // Auto-refresh when an operational alert state changes
        loadDashboardData();
      }
    }
  }, [lastMessage, loadDashboardData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIncidentsCount={stats?.total_open || 0}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Operational KPI Bar */}
        <KpiHeader kpis={kpis} isLoading={isLoading && !kpis} />

        {/* Tab Views */}
        {activeTab === 'incidents' && (
          <IncidentConsole
            incidents={incidents}
            stats={stats}
            isLoading={isLoading}
            onRefresh={loadDashboardData}
          />
        )}

        {activeTab === 'fleet' && <MachineFleetView />}

        {activeTab === 'rules' && <AlertRulesView />}

        {activeTab === 'quality' && <DataQualityView />}

        {activeTab === 'superset' && <SupersetLauncherView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        FactoryPulse Platform — Manufacturing OEE & Downtime Intelligence • Powered by PostgreSQL Star Schema, FastAPI & Apache Superset
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
    </div>
  );
};
