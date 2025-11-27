'use client';

import { useEffect, useState } from 'react';
import { Clock, ArrowRight, Timer, RefreshCw } from 'lucide-react';
import { agentApi } from '@/lib/api';

interface QueuedTx {
  eventTitle: string;
  type: string;
  formatted: string;
  executionTime: string;
  timeUntilExecution: number;
  attempts: number;
  addedAt: string;
}

export default function TransactionQueue() {
  const [queue, setQueue] = useState<QueuedTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const response = await agentApi.getQueue();
      setQueue(response.data.queue || []);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeUntil = (seconds: number): string => {
    if (seconds <= 0) return 'Executing...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Timer size={20} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Pending Transactions</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
            {queue.length}
          </span>
          <button
            onClick={fetchQueue}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-1">No pending transactions</p>
          <p className="text-gray-400 text-sm">
            Create a calendar event like &quot;Send 1 STT to 0x...&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {queue.map((tx, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  tx.type === 'transfer' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {tx.type.toUpperCase()}
                </span>
                <div className={`flex items-center gap-1.5 text-sm font-medium ${
                  tx.timeUntilExecution <= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  <Clock size={14} />
                  {formatTimeUntil(tx.timeUntilExecution)}
                </div>
              </div>

              <p className="font-semibold text-gray-800 mb-2 truncate" title={tx.eventTitle}>
                {tx.eventTitle}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Executes: {new Date(tx.executionTime).toLocaleString()}
                </span>
                {tx.attempts > 0 && (
                  <span className="text-orange-600">
                    Attempt {tx.attempts + 1}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

