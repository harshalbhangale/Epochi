'use client';

import { useState, useEffect } from 'react';
import WalletCard from '@/components/WalletCard';
import AgentStatus from '@/components/AgentStatus';
import TransactionQueue from '@/components/TransactionQueue';
import CalendarEvents from '@/components/CalendarEvents';
import { Calendar, Github, Zap, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [calendarId] = useState('primary');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-pulse text-purple-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-purple-200">
                <Calendar className="text-white" size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Epochi
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  Calendar-Powered DeFi on Somnia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
              >
                <Zap size={16} />
                Somnia Network
              </a>
              <a
                href="https://github.com/harshalbhangale/Epochi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
              >
                <Github size={18} />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl shadow-purple-200 p-8 mb-8 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-3">
              Welcome to Epochi 🚀
            </h2>
            <p className="text-purple-100 text-lg mb-6 max-w-2xl">
              Schedule cryptocurrency transactions directly from your Google Calendar.
              No wallet extensions needed – your wallet is generated automatically!
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-lg">✅</span>
                <span className="font-medium">Deterministic Wallets</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-lg">⚡</span>
                <span className="font-medium">Somnia Testnet</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="text-lg">🤖</span>
                <span className="font-medium">Auto-Execution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <WalletCard calendarId={calendarId} />
          </div>
          <div className="lg:col-span-2">
            <AgentStatus />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TransactionQueue />
          <CalendarEvents />
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            🚀 Quick Start Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number="1"
              title="Connect Calendar"
              description="Authenticate with Google Calendar to monitor your events"
              linkText="Authenticate"
              linkHref="http://localhost:3001/api/calendar/auth"
              color="purple"
            />
            <StepCard
              number="2"
              title="Fund Your Wallet"
              description="Get testnet STT tokens from the Somnia faucet"
              linkText="Get Tokens"
              linkHref="https://faucet.somnia.network"
              color="indigo"
            />
            <StepCard
              number="3"
              title="Create Event"
              description='Add "Send 1 STT to 0x..." to your calendar'
              linkText="Open Calendar"
              linkHref="https://calendar.google.com"
              color="blue"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-600 font-medium">
                Built with Next.js, Viem, and Somnia Data Streams
              </p>
              <p className="text-gray-400 text-sm mt-1">
                © 2025 Epochi • Calendar-Powered DeFi
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://docs.somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-purple-600 transition-colors text-sm flex items-center gap-1"
              >
                Somnia Docs <ExternalLink size={12} />
              </a>
              <a
                href="https://shannon-explorer.somnia.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-purple-600 transition-colors text-sm flex items-center gap-1"
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  linkText,
  linkHref,
  color,
}: {
  number: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  color: 'purple' | 'indigo' | 'blue';
}) {
  const colorClasses = {
    purple: 'border-l-purple-500 bg-purple-50',
    indigo: 'border-l-indigo-500 bg-indigo-50',
    blue: 'border-l-blue-500 bg-blue-50',
  };
  
  const textColors = {
    purple: 'text-purple-600 hover:text-purple-700',
    indigo: 'text-indigo-600 hover:text-indigo-700',
    blue: 'text-blue-600 hover:text-blue-700',
  };

  return (
    <div className={`border-l-4 ${colorClasses[color]} rounded-r-xl p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-8 h-8 rounded-full bg-gradient-to-br from-${color}-500 to-${color}-600 text-white flex items-center justify-center font-bold text-sm`}>
          {number}
        </span>
        <h4 className="font-bold text-gray-900">{title}</h4>
      </div>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <a
        href={linkHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm font-medium ${textColors[color]} flex items-center gap-1`}
      >
        {linkText} <ExternalLink size={12} />
      </a>
    </div>
  );
}
