import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, User as UserIcon, Shield, Wrench, Eye, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(username, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRoleSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">FactoryPulse Authentication</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Quick Role Fill Buttons */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Quick Sign In as:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickRoleSelect('admin', 'admin123')}
              className={`p-2 rounded-lg border text-left text-xs transition ${
                username === 'admin'
                  ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
              <div className="text-[10px] text-slate-500">Full platform control</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('engineer', 'engineer123')}
              className={`p-2 rounded-lg border text-left text-xs transition ${
                username === 'engineer'
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>Engineer</span>
              </div>
              <div className="text-[10px] text-slate-500">RCA & Rule Config</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('supervisor', 'supervisor123')}
              className={`p-2 rounded-lg border text-left text-xs transition ${
                username === 'supervisor'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supervisor</span>
              </div>
              <div className="text-[10px] text-slate-500">Shift routing & Ack</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('operator', 'operator123')}
              className={`p-2 rounded-lg border text-left text-xs transition ${
                username === 'operator'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold flex items-center space-x-1">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Operator</span>
              </div>
              <div className="text-[10px] text-slate-500">Line Telemetry View</div>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition shadow mt-2"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
