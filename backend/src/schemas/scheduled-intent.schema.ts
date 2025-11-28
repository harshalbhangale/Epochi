/**
 * Scheduled Intent Schema for Somnia Data Streams
 * 
 * USE CASE: Transparent Pre-Announcement of Scheduled Transactions
 * 
 * This schema stores the user's intent to execute a transaction at a specific time.
 * It creates an immutable, publicly verifiable record BEFORE the transaction happens.
 * 
 * Benefits:
 * - Transparency: Anyone can see scheduled transactions before they execute
 * - Accountability: Users commit to their scheduled actions on-chain
 * - Verification: Third parties can verify execution matched intent
 * - MEV Protection: Scheduled timing is publicly committed (no front-running claims)
 */

export const SCHEDULED_INTENT_SCHEMA = `uint64 scheduledTime, bytes32 intentId, address userWallet, string transactionType, string fromToken, string toToken, uint256 amount, string description, uint64 createdAt, string status` as const;

/**
 * Intent status enum
 */
export enum IntentStatus {
  SCHEDULED = 'scheduled',   // Intent created, waiting for execution
  EXECUTING = 'executing',   // Currently being executed
  COMPLETED = 'completed',   // Successfully executed
  CANCELLED = 'cancelled',   // User cancelled
  EXPIRED = 'expired',       // Time passed without execution
  FAILED = 'failed'          // Execution attempted but failed
}

/**
 * Scheduled Intent data interface
 */
export interface ScheduledIntentData {
  scheduledTime: bigint;      // When the transaction should execute
  intentId: string;           // Unique intent identifier
  userWallet: string;         // User's wallet address
  transactionType: string;    // swap, transfer, stake, etc.
  fromToken: string;          // Source token
  toToken: string;            // Destination token/address
  amount: bigint;             // Amount in wei
  description: string;        // Human-readable description
  createdAt: bigint;          // When the intent was created
  status: IntentStatus;       // Current status
}

/**
 * Helper to create intent ID
 */
export function createIntentId(
  userWallet: string,
  scheduledTime: number,
  nonce: number
): string {
  return `intent-${userWallet.slice(0, 10)}-${scheduledTime}-${nonce}`;
}

