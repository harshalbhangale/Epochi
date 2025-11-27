'use client';

import { useEffect, useState } from 'react';
import { Activity, Play, Square, Clock, Target, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { agentApi } from '@/lib/api';

interface AgentStats {
  isRunning: boolean;
  lastCheckTime: string | null;
  totalChecks: number;
  transactionsDetected: number;
  transactionsExecuted: number;
  transactionsFailed: number;
  queueSize: number;
}

export default function AgentStatus() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await agentApi.getStatus();
      setStats(response.data.agent);
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async () => {
    setActionLoading(true);
    try {
      if (stats?.isRunning) {
        await agentApi.stop();
      } else {
        await agentApi.start();
      }
      await fetchStatus();
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${stats?.isRunning ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Activity size={22} className={stats?.isRunning ? 'text-emerald-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Calendar Agent</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stats?.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
              <span className={`text-sm font-medium ${stats?.isRunning ? 'text-emerald-600' : 'text-gray-500'}`}>
                {stats?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={toggleAgent}
          disabled={actionLoading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            stats?.isRunning
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
          } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {actionLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : stats?.isRunning ? (
            <Square size={18} />
          ) : (
            <Play size={18} />
          )}
          {stats?.isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock size={18} />}
          label="Total Checks"
          value={stats?.totalChecks || 0}
          color="blue"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Detected"
          value={stats?.transactionsDetected || 0}
          color="purple"
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Executed"
          value={stats?.transactionsExecuted || 0}
          color="emerald"
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="In Queue"
          value={stats?.queueSize || 0}
          color="amber"
        />
      </div>

      {stats?.lastCheckTime && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Last check: {new Date(stats.lastCheckTime).toLocaleTimeString()}</span>
          <span>Polling every 30s</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: 'blue' | 'purple' | 'emerald' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color].split(' ')[0]}`}>
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color].split(' ')[1]}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${colorClasses[color].split(' ')[1]}`}>
        {value}
      </p>
    </div>
  );
}

