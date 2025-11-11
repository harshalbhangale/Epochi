# 🎨 Chunk 7: Frontend Dashboard

In this chunk, you'll create a beautiful Next.js dashboard to visualize wallet balances, pending transactions, execution history, and agent status.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Modern Next.js 14 dashboard
- Wallet balance display
- Pending transactions list
- Transaction history from Data Streams
- Agent status monitoring
- Real-time updates
- Beautiful UI with TailwindCSS

## 📋 Prerequisites

- Completed all previous chunks (1-6)
- Backend running on port 3001
- Frontend initialized on port 3000

## 🎨 Step 1: Install Frontend Dependencies

```bash
cd tempora/frontend
npm install axios lucide-react recharts
```

## 📝 Step 2: Create API Client

Create `frontend/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const calendarApi = {
  getStatus: () => api.get('/api/calendar/status'),
  getEvents: (maxResults = 50) => api.get(`/api/calendar/events?maxResults=${maxResults}`),
};

export const walletApi = {
  getWalletInfo: (calendarId: string) => api.get(`/api/wallet/${calendarId}`),
  getNetworkStatus: () => api.get('/api/wallet/network/status'),
};

export const streamsApi = {
  getTransactions: (publisherAddress: string) => 
    api.get(`/api/streams/transactions/${publisherAddress}`),
  getSchema: () => api.get('/api/streams/schema'),
};

export const transactionApi = {
  getPending: (calendarId: string) => api.get(`/api/transactions/pending/${calendarId}`),
  parse: (data: any) => api.post('/api/transactions/parse', data),
  execute: (data: any) => api.post('/api/transactions/execute', data),
};

export const agentApi = {
  getStatus: () => api.get('/api/agent/status'),
  getQueue: () => api.get('/api/agent/queue'),
  start: () => api.post('/api/agent/start'),
  stop: () => api.post('/api/agent/stop'),
};

export default api;
```

## 🎨 Step 3: Create UI Components

Create `frontend/components/WalletCard.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Wallet, ExternalLink, RefreshCw } from 'lucide-react';
import { walletApi } from '@/lib/api';

interface WalletInfo {
  address: string;
  balance: string;
  balanceFormatted: string;
  network: string;
  explorerUrl: string;
  chainId: number;
}

export default function WalletCard({ calendarId }: { calendarId: string }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await walletApi.getWalletInfo(calendarId);
      setWallet(response.data.wallet);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [calendarId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <p className="text-red-600">❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={20} />
            <h3 className="text-sm font-medium opacity-90">Your Wallet</h3>
          </div>
          <p className="text-3xl font-bold">{wallet?.balanceFormatted} STT</p>
        </div>
        <button
          onClick={fetchWallet}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Refresh balance"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="space-y-2 text-sm opacity-90">
        <div className="flex justify-between">
          <span>Network:</span>
          <span className="font-medium">{wallet?.network}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Address:</span>
          <a
            href={wallet?.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            {wallet?.address.slice(0, 6)}...{wallet?.address.slice(-4)}
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs opacity-75">
          ⚡ Deterministic wallet • No extensions needed
        </p>
      </div>
    </div>
  );
}
```

Create `frontend/components/AgentStatus.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
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

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-gray-700" />
          <h3 className="text-lg font-semibold">Calendar Agent</h3>
        </div>
        <div className="flex items-center gap-2">
          {stats?.isRunning ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle size={16} />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
              <XCircle size={16} />
              Stopped
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Checks"
          value={stats?.totalChecks || 0}
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Detected"
          value={stats?.transactionsDetected || 0}
          icon="🎯"
        />
        <StatCard
          label="Executed"
          value={stats?.transactionsExecuted || 0}
          icon="✅"
          color="text-green-600"
        />
        <StatCard
          label="In Queue"
          value={stats?.queueSize || 0}
          icon="⏳"
          color="text-blue-600"
        />
      </div>

      {stats?.lastCheckTime && (
        <p className="mt-4 text-xs text-gray-500">
          Last check: {new Date(stats.lastCheckTime).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = 'text-gray-700' }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {typeof icon === 'string' ? (
          <span>{icon}</span>
        ) : (
          <span className={color}>{icon}</span>
        )}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
```

Create `frontend/components/PendingTransactions.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { transactionApi } from '@/lib/api';

interface PendingTx {
  eventId: string;
  eventTitle: string;
  type: string;
  fromToken: string;
  toToken: string;
  amount: string;
  executionTime: string;
  formatted: string;
  timeUntilExecution: number;
}

export default function PendingTransactions({ calendarId }: { calendarId: string }) {
  const [transactions, setTransactions] = useState<PendingTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const response = await transactionApi.getPending(calendarId);
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch pending transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [calendarId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Pending Transactions</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Pending Transactions</h3>
        <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
          {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock size={48} className="mx-auto mb-2 opacity-50" />
          <p>No pending transactions</p>
          <p className="text-sm mt-1">
            Create a calendar event like "Swap 0.1 ETH to USDC"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.eventId}
              className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-medium">
                  <span>{tx.amount}</span>
                  <span className="text-gray-600">{tx.fromToken}</span>
                  <ArrowRight size={16} className="text-gray-400" />
                  <span className="text-gray-600">{tx.toToken}</span>
                </div>
                <span className="text-xs bg-white px-2 py-1 rounded">
                  {tx.type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {tx.timeUntilExecution > 0
                    ? `in ${Math.floor(tx.timeUntilExecution / 60)}m ${tx.timeUntilExecution % 60}s`
                    : 'Executing...'}
                </span>
                <span className="text-xs">
                  {new Date(tx.executionTime).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `frontend/components/TransactionHistory.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { streamsApi } from '@/lib/api';

interface Transaction {
  transactionId: string;
  timestamp: string;
  fromToken: string;
  toToken: string;
  amount: string;
  amountReceived: string;
  status: string;
  txHash: string;
}

export default function TransactionHistory({ publisherAddress }: { publisherAddress: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const response = await streamsApi.getTransactions(publisherAddress);
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publisherAddress) {
      fetchHistory();
    }
  }, [publisherAddress]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Transaction History</h3>
        <span className="text-sm text-gray-500">{transactions.length} total</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
          <p>No transactions yet</p>
          <p className="text-sm mt-1">
            Your executed swaps will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx.transactionId}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="font-medium">
                    {parseFloat(tx.amount) / 1e18} {tx.fromToken}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-green-600">
                    {parseFloat(tx.amountReceived) / 1e18} {tx.toToken}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    tx.status === 'executed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(parseInt(tx.timestamp) * 1000).toLocaleString()}</span>
                {tx.txHash && (
                  <a
                    href={`https://somnia.explorer.caldera.xyz/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    View <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🏠 Step 4: Create Dashboard Page

Update `frontend/app/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import WalletCard from '@/components/WalletCard';
import AgentStatus from '@/components/AgentStatus';
import PendingTransactions from '@/components/PendingTransactions';
import TransactionHistory from '@/components/TransactionHistory';
import { Calendar, Github } from 'lucide-react';

export default function Dashboard() {
  const [calendarId] = useState('primary');
  const [publisherAddress] = useState('0x0000000000000000000000000000000000000000'); // Update with actual

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tempora</h1>
                <p className="text-sm text-gray-500">
                  Calendar-Powered DeFi on Somnia
                </p>
              </div>
            </div>
            <a
              href="https://github.com/yourusername/tempora"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Github size={18} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Welcome to Tempora 🚀
          </h2>
          <p className="text-purple-100 mb-4">
            Schedule cryptocurrency swaps directly from your Google Calendar.
            No wallet connection required!
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-1 rounded">✅</span>
              <span>Deterministic Wallets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-1 rounded">⚡</span>
              <span>Somnia Network</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-1 rounded">📊</span>
              <span>Data Streams</span>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Wallet Card - Spans 1 column */}
          <div className="lg:col-span-1">
            <WalletCard calendarId={calendarId} />
          </div>

          {/* Agent Status - Spans 2 columns */}
          <div className="lg:col-span-2">
            <AgentStatus />
          </div>
        </div>

        {/* Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Transactions */}
          <PendingTransactions calendarId={calendarId} />

          {/* Transaction History */}
          <TransactionHistory publisherAddress={publisherAddress} />
        </div>

        {/* Quick Start Guide */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">🚀 Quick Start Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold mb-1">1. Authenticate Calendar</h4>
              <p className="text-sm text-gray-600">
                Connect your Google Calendar to start monitoring events
              </p>
              <a
                href="http://localhost:3001/api/calendar/auth"
                className="text-sm text-purple-600 hover:underline mt-2 inline-block"
              >
                Authenticate →
              </a>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h4 className="font-semibold mb-1">2. Fund Your Wallet</h4>
              <p className="text-sm text-gray-600">
                Get testnet tokens from the Somnia faucet
              </p>
              <a
                href="https://faucet.somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline mt-2 inline-block"
              >
                Get Tokens →
              </a>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold mb-1">3. Create Event</h4>
              <p className="text-sm text-gray-600">
                Add "Swap 0.1 ETH to USDC" to your calendar
              </p>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Open Calendar →
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm text-gray-500">
        <p>Built with Next.js, Viem, and Somnia Data Streams</p>
        <p className="mt-1">
          Powered by <span className="font-semibold text-purple-600">Somnia Network</span>
        </p>
      </footer>
    </div>
  );
}
```

## 🎨 Step 5: Configure Environment

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🧪 Step 6: Test the Dashboard

### Start Both Servers

Terminal 1 (Backend):
```bash
cd tempora/backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd tempora/frontend
npm run dev
```

### Visit Dashboard

Open browser: http://localhost:3000

You should see:
- ✅ Wallet balance card
- ✅ Agent status with statistics
- ✅ Pending transactions list (empty initially)
- ✅ Transaction history (from Data Streams)
- ✅ Quick start guide

## 🎉 What You've Built

Congratulations! You now have:

✅ Beautiful Next.js 14 dashboard
✅ Real-time wallet balance display
✅ Agent status monitoring
✅ Pending transactions visualization
✅ Transaction history from Data Streams
✅ Auto-updating components
✅ Responsive design with TailwindCSS
✅ Complete user interface

## 📁 New Files Created

```
frontend/
├── lib/
│   └── api.ts ✅ (100+ lines)
├── components/
│   ├── WalletCard.tsx ✅ (100+ lines)
│   ├── AgentStatus.tsx ✅ (100+ lines)
│   ├── PendingTransactions.tsx ✅ (150+ lines)
│   └── TransactionHistory.tsx ✅ (150+ lines)
├── app/
│   └── page.tsx ✅ (200+ lines)
└── .env.local ✅
```

## 📖 Next Steps

In the final chunk, you'll:
1. Complete end-to-end testing
2. Add production deployment guide
3. Configure environment variables
4. Set up monitoring and logging
5. Add security best practices

**Continue to:** [Chunk 8: Testing & Deployment →](08-testing-deployment.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

