'use client';

import { useEffect, useState } from 'react';
import { Wallet, ExternalLink, RefreshCw, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

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

  const copyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [calendarId]);

  if (loading && !wallet) {
    return (
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl shadow-xl p-6 animate-pulse">
        <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-white/20 rounded w-1/2 mb-4"></div>
        <div className="h-3 bg-white/20 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Wallet size={20} />
          <span className="font-semibold">Wallet Error</span>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchWallet}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white"></div>
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white"></div>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={18} className="opacity-80" />
              <span className="text-sm font-medium opacity-80">Your Wallet</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              {parseFloat(wallet?.balanceFormatted || '0').toFixed(4)}
              <span className="text-xl ml-2 opacity-80">STT</span>
            </p>
          </div>
          <button
            onClick={fetchWallet}
            className={`p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all ${loading ? 'animate-spin' : ''}`}
            title="Refresh balance"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-70">Network</span>
            <span className="font-medium bg-white/10 px-3 py-1 rounded-full">
              {wallet?.network}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="opacity-70">Chain ID</span>
            <span className="font-mono">{wallet?.chainId}</span>
          </div>

          <div className="pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70 font-mono">
                {wallet?.address.slice(0, 10)}...{wallet?.address.slice(-8)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copyAddress}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <a
                  href={wallet?.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 text-xs opacity-60">
          ⚡ Deterministic wallet • No extensions needed
        </div>
      </div>
    </div>
  );
}

