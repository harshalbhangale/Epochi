/**
 * User Statistics Schema for Somnia Data Streams
 * 
 * USE CASE: On-Chain User Reputation & Activity Metrics
 * 
 * This schema tracks aggregated user activity metrics on-chain.
 * Creates a decentralized reputation system based on actual transaction history.
 * 
 * Benefits:
 * - Reputation: Users build on-chain reputation through successful executions
 * - Trust: Other users/protocols can verify activity history
 * - Analytics: Protocol-level insights without centralized databases
 * - Portability: User reputation follows them across applications
 */

export const USER_STATS_SCHEMA = `address userWallet, uint64 totalTransactions, uint64 successfulTransactions, uint64 failedTransactions, uint256 totalVolume, uint64 firstActivityAt, uint64 lastActivityAt, string mostUsedAction` as const;

/**
 * User stats data interface
 */
export interface UserStatsData {
  userWallet: string;              // User's wallet address
  totalTransactions: bigint;       // Total number of transactions attempted
  successfulTransactions: bigint;  // Number of successful transactions
  failedTransactions: bigint;      // Number of failed transactions
  totalVolume: bigint;             // Total volume in wei
  firstActivityAt: bigint;         // Timestamp of first activity
  lastActivityAt: bigint;          // Timestamp of last activity
  mostUsedAction: string;          // Most common action type (swap, transfer, etc.)
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(stats: UserStatsData): number {
  const total = Number(stats.totalTransactions);
  if (total === 0) return 0;
  return (Number(stats.successfulTransactions) / total) * 100;
}

/**
 * Get reputation tier based on stats
 */
export function getReputationTier(stats: UserStatsData): string {
  const successRate = calculateSuccessRate(stats);
  const total = Number(stats.totalTransactions);

  if (total < 5) return '🌱 Newcomer';
  if (total < 20 && successRate > 80) return '⭐ Rising Star';
  if (total < 50 && successRate > 90) return '🔥 Active Trader';
  if (total >= 50 && successRate > 95) return '💎 Diamond Hands';
  if (successRate < 50) return '⚠️ Needs Improvement';
  return '📊 Regular User';
}

