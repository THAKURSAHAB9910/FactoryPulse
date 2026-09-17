import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  Activity, 
  AlertTriangle, 
  Cpu, 
  Sliders, 
  Database, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  Wifi,
  WifiOff
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openIncidentsCount: number;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openIncidentsCount,
  onOpenLogin,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const navItems = [
    { id: 'incidents', label: 'Incident Console', icon: AlertTriangle, badge: openIncidentsCount },
    { id: 'fleet', label: 'Machine Fleet & Telemetry', icon: Cpu },
    { id: 'rules', label: 'Alert Rules Engine', icon: Sliders },
    { id: 'quality', label: 'Data Quality & Audit', icon: Database },
    { id: 'superset', label: 'Superset BI Hub', icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('incidents')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">FactoryPulse</span>
                <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  OEE 2.0
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">Manufacturing Downtime & Telemetry Intelligence</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status & User Controls */}
          <div className="flex items-center space-x-4">
            {/* Live WebSocket Status Pill */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title={isConnected ? 'Live Telemetry WebSocket Connected' : 'Reconnecting to WebSocket...'}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                  <span className="hidden sm:inline">Live Stream</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-white">{user.full_name}</div>
                  <div className="text-xs font-mono text-sky-400">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-sm transition"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
