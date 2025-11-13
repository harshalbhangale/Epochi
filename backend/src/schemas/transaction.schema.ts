/**
 * Schema definitions for Somnia Data Streams
 */

/**
 * Transaction Record Schema
 * Stores information about each swap transaction
 * Schema must be a single-line string for Somnia Data Streams SDK
 */
export const TRANSACTION_SCHEMA = `uint64 timestamp, bytes32 transactionId, address userWallet, string calendarId, string eventId, string transactionType, string fromToken, string toToken, uint256 amount, uint256 amountReceived, bytes32 txHash, string status, string notes` as const;

/**
 * Transaction type enum
 */
export enum TransactionType {
  SWAP = 'swap',
  TRANSFER = 'transfer',
  STAKE = 'stake',
  UNSTAKE = 'unstake'
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Transaction data interface matching the schema
 */
export interface TransactionData {
  timestamp: bigint;
  transactionId: string;
  userWallet: string;
  calendarId: string;
  eventId: string;
  transactionType: TransactionType;
  fromToken: string;
  toToken: string;
  amount: bigint;
  amountReceived: bigint;
  txHash: string;
  status: TransactionStatus;
  notes: string;
}

/**
 * Helper to create transaction ID
 */
export function createTransactionId(
  calendarId: string,
  eventId: string,
  timestamp: number
): string {
  return `${calendarId}-${eventId}-${timestamp}`;
}

