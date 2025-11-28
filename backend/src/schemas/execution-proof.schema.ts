/**
 * Execution Proof Schema for Somnia Data Streams
 * 
 * USE CASE: Cryptographic Proof of Scheduled Transaction Execution
 * 
 * This schema creates an immutable attestation that links:
 * 1. The original scheduled intent (intentId)
 * 2. The actual execution (txHash)
 * 3. Timing verification (scheduledTime vs actualTime)
 * 
 * Benefits:
 * - Verification: Third parties can verify execution matched schedule
 * - Compliance: Audit trail for regulatory requirements
 * - Dispute Resolution: Immutable proof of when/how transactions executed
 * - SLA Tracking: Measure execution timing accuracy
 */

export const EXECUTION_PROOF_SCHEMA = `bytes32 proofId, bytes32 intentId, bytes32 txHash, uint64 scheduledTime, uint64 actualExecutionTime, int64 timeDelta, string executionStatus, uint256 expectedAmount, uint256 actualAmount, string verificationHash` as const;

/**
 * Execution proof data interface
 */
export interface ExecutionProofData {
  proofId: string;              // Unique proof identifier
  intentId: string;             // Reference to scheduled intent
  txHash: string;               // Actual transaction hash
  scheduledTime: bigint;        // When it was supposed to execute
  actualExecutionTime: bigint;  // When it actually executed
  timeDelta: bigint;            // Difference in seconds (can be negative)
  executionStatus: string;      // success, failed, partial
  expectedAmount: bigint;       // Amount specified in intent
  actualAmount: bigint;         // Amount actually transacted
  verificationHash: string;     // Hash of intent + result for verification
}

/**
 * Create verification hash
 */
export function createVerificationHash(
  intentId: string,
  txHash: string,
  amount: bigint
): string {
  const crypto = require('crypto');
  const data = `${intentId}:${txHash}:${amount.toString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate time delta in human-readable format
 */
export function formatTimeDelta(deltaSeconds: bigint): string {
  const seconds = Number(deltaSeconds);
  const absSeconds = Math.abs(seconds);
  
  if (absSeconds < 60) {
    return `${seconds >= 0 ? '+' : ''}${seconds}s`;
  } else if (absSeconds < 3600) {
    const minutes = Math.floor(absSeconds / 60);
    return `${seconds >= 0 ? '+' : '-'}${minutes}m`;
  } else {
    const hours = Math.floor(absSeconds / 3600);
    return `${seconds >= 0 ? '+' : '-'}${hours}h`;
  }
}

/**
 * Check if execution was on time (within acceptable window)
 */
export function wasOnTime(deltaSeconds: bigint, windowSeconds: number = 60): boolean {
  return Math.abs(Number(deltaSeconds)) <= windowSeconds;
}

