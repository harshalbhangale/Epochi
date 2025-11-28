import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import crypto from 'crypto';

// Import all schemas
import {
  TRANSACTION_SCHEMA,
  TransactionData,
  TransactionStatus,
  createTransactionId,
} from '../../schemas/transaction.schema';

import {
  SCHEDULED_INTENT_SCHEMA,
  ScheduledIntentData,
  IntentStatus,
  createIntentId,
} from '../../schemas/scheduled-intent.schema';

import {
  USER_STATS_SCHEMA,
  UserStatsData,
  calculateSuccessRate,
  getReputationTier,
} from '../../schemas/user-stats.schema';

import {
  EXECUTION_PROOF_SCHEMA,
  ExecutionProofData,
  createVerificationHash,
  formatTimeDelta,
  wasOnTime,
} from '../../schemas/execution-proof.schema';

/**
 * Somnia Testnet chain configuration
 */
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Test Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
});

/**
 * EnhancedDataStreamsService - Full Data Streams Integration
 * 
 * Showcases 4 key use cases for Somnia Data Streams:
 * 
 * 1. TRANSACTION AUDIT TRAIL - Immutable record of all executed transactions
 * 2. SCHEDULED INTENT REGISTRY - Pre-announce transactions before execution
 * 3. USER REPUTATION SYSTEM - On-chain activity metrics and trust scores
 * 4. EXECUTION PROOFS - Cryptographic verification of scheduled execution
 */
export class EnhancedDataStreamsService {
  private sdk: any;
  private publisherAddress: string;

  // Schema encoders for each data type
  private transactionEncoder: SchemaEncoder;
  private intentEncoder: SchemaEncoder;
  private statsEncoder: SchemaEncoder;
  private proofEncoder: SchemaEncoder;

  // Schema IDs (computed on initialization)
  private schemaIds = {
    transaction: '',
    intent: '',
    stats: '',
    proof: '',
  };

  constructor(privateKey: string) {
    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    this.publisherAddress = account.address;

    // Create clients
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL),
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL),
    });

    // Initialize SDK
    this.sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    // Initialize schema encoders
    this.transactionEncoder = new SchemaEncoder(TRANSACTION_SCHEMA);
    this.intentEncoder = new SchemaEncoder(SCHEDULED_INTENT_SCHEMA);
    this.statsEncoder = new SchemaEncoder(USER_STATS_SCHEMA);
    this.proofEncoder = new SchemaEncoder(EXECUTION_PROOF_SCHEMA);

    console.log('✅ Enhanced Data Streams Service initialized');
    console.log(`📍 Publisher address: ${this.publisherAddress}`);
  }

  /**
   * Initialize all schema IDs
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Computing schema IDs...');

      this.schemaIds.transaction = await this.sdk.streams.computeSchemaId(TRANSACTION_SCHEMA);
      this.schemaIds.intent = await this.sdk.streams.computeSchemaId(SCHEDULED_INTENT_SCHEMA);
      this.schemaIds.stats = await this.sdk.streams.computeSchemaId(USER_STATS_SCHEMA);
      this.schemaIds.proof = await this.sdk.streams.computeSchemaId(EXECUTION_PROOF_SCHEMA);

      console.log('📊 Schema IDs:');
      console.log(`   Transaction: ${this.schemaIds.transaction}`);
      console.log(`   Intent: ${this.schemaIds.intent}`);
      console.log(`   Stats: ${this.schemaIds.stats}`);
      console.log(`   Proof: ${this.schemaIds.proof}`);
    } catch (error) {
      console.error('❌ Error computing schema IDs:', error);
      throw error;
    }
  }

  // ========================================
  // USE CASE 1: TRANSACTION AUDIT TRAIL
  // ========================================

  /**
   * Record a completed transaction to Data Streams
   */
  async recordTransaction(data: TransactionData): Promise<string> {
    if (!this.schemaIds.transaction) await this.initialize();

    const encodedData = this.transactionEncoder.encodeData([
      { name: 'timestamp', value: data.timestamp.toString(), type: 'uint64' },
      { name: 'transactionId', value: this.stringToBytes32(data.transactionId), type: 'bytes32' },
      { name: 'userWallet', value: data.userWallet, type: 'address' },
      { name: 'calendarId', value: data.calendarId, type: 'string' },
      { name: 'eventId', value: data.eventId, type: 'string' },
      { name: 'transactionType', value: data.transactionType, type: 'string' },
      { name: 'fromToken', value: data.fromToken, type: 'string' },
      { name: 'toToken', value: data.toToken, type: 'string' },
      { name: 'amount', value: data.amount.toString(), type: 'uint256' },
      { name: 'amountReceived', value: data.amountReceived.toString(), type: 'uint256' },
      { name: 'txHash', value: this.stringToBytes32(data.txHash), type: 'bytes32' },
      { name: 'status', value: data.status, type: 'string' },
      { name: 'notes', value: data.notes, type: 'string' },
    ]);

    console.log(`📝 [AUDIT] Recording transaction: ${data.transactionId}`);

    const txHash = await this.sdk.streams.set([
      {
        id: this.stringToBytes32(data.transactionId),
        schemaId: this.schemaIds.transaction,
        data: encodedData,
      },
    ]);

    console.log(`✅ [AUDIT] Transaction recorded: ${txHash}`);
    return txHash;
  }

  // ========================================
  // USE CASE 2: SCHEDULED INTENT REGISTRY
  // ========================================

  /**
   * Pre-announce a scheduled transaction intent
   * This creates transparency - anyone can see upcoming scheduled transactions
   */
  async announceIntent(data: ScheduledIntentData): Promise<string> {
    if (!this.schemaIds.intent) await this.initialize();

    const encodedData = this.intentEncoder.encodeData([
      { name: 'scheduledTime', value: data.scheduledTime.toString(), type: 'uint64' },
      { name: 'intentId', value: this.stringToBytes32(data.intentId), type: 'bytes32' },
      { name: 'userWallet', value: data.userWallet, type: 'address' },
      { name: 'transactionType', value: data.transactionType, type: 'string' },
      { name: 'fromToken', value: data.fromToken, type: 'string' },
      { name: 'toToken', value: data.toToken, type: 'string' },
      { name: 'amount', value: data.amount.toString(), type: 'uint256' },
      { name: 'description', value: data.description, type: 'string' },
      { name: 'createdAt', value: data.createdAt.toString(), type: 'uint64' },
      { name: 'status', value: data.status, type: 'string' },
    ]);

    console.log(`📢 [INTENT] Announcing scheduled intent: ${data.intentId}`);
    console.log(`   ⏰ Scheduled for: ${new Date(Number(data.scheduledTime) * 1000).toISOString()}`);

    const txHash = await this.sdk.streams.set([
      {
        id: this.stringToBytes32(data.intentId),
        schemaId: this.schemaIds.intent,
        data: encodedData,
      },
    ]);

    console.log(`✅ [INTENT] Intent announced on-chain: ${txHash}`);
    return txHash;
  }

  /**
   * Update intent status (executing, completed, cancelled, etc.)
   */
  async updateIntentStatus(intentId: string, newStatus: IntentStatus): Promise<string> {
    // Read existing intent
    const existing = await this.getIntent(intentId);
    if (!existing) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    // Update status
    existing.status = newStatus;
    return await this.announceIntent(existing);
  }

  /**
   * Get a scheduled intent by ID
   */
  async getIntent(intentId: string): Promise<ScheduledIntentData | null> {
    if (!this.schemaIds.intent) await this.initialize();

    try {
      const data = await this.sdk.streams.getByKey(
        this.schemaIds.intent,
        this.publisherAddress,
        this.stringToBytes32(intentId)
      );

      if (!data) return null;

      const decoded = this.intentEncoder.decode(data);
      return {
        scheduledTime: BigInt(decoded[0]),
        intentId: decoded[1],
        userWallet: decoded[2],
        transactionType: decoded[3],
        fromToken: decoded[4],
        toToken: decoded[5],
        amount: BigInt(decoded[6]),
        description: decoded[7],
        createdAt: BigInt(decoded[8]),
        status: decoded[9] as IntentStatus,
      };
    } catch (error) {
      console.error('Error reading intent:', error);
      return null;
    }
  }

  // ========================================
  // USE CASE 3: USER REPUTATION SYSTEM
  // ========================================

  /**
   * Update user statistics after a transaction
   */
  async updateUserStats(
    userWallet: string,
    transactionSucceeded: boolean,
    amount: bigint,
    actionType: string
  ): Promise<string> {
    if (!this.schemaIds.stats) await this.initialize();

    // Get existing stats or create new
    let stats = await this.getUserStats(userWallet);
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (!stats) {
      stats = {
        userWallet,
        totalTransactions: BigInt(0),
        successfulTransactions: BigInt(0),
        failedTransactions: BigInt(0),
        totalVolume: BigInt(0),
        firstActivityAt: now,
        lastActivityAt: now,
        mostUsedAction: actionType,
      };
    }

    // Update stats
    stats.totalTransactions += BigInt(1);
    if (transactionSucceeded) {
      stats.successfulTransactions += BigInt(1);
      stats.totalVolume += amount;
    } else {
      stats.failedTransactions += BigInt(1);
    }
    stats.lastActivityAt = now;
    stats.mostUsedAction = actionType; // Simplified - in production, track counts

    const encodedData = this.statsEncoder.encodeData([
      { name: 'userWallet', value: stats.userWallet, type: 'address' },
      { name: 'totalTransactions', value: stats.totalTransactions.toString(), type: 'uint64' },
      { name: 'successfulTransactions', value: stats.successfulTransactions.toString(), type: 'uint64' },
      { name: 'failedTransactions', value: stats.failedTransactions.toString(), type: 'uint64' },
      { name: 'totalVolume', value: stats.totalVolume.toString(), type: 'uint256' },
      { name: 'firstActivityAt', value: stats.firstActivityAt.toString(), type: 'uint64' },
      { name: 'lastActivityAt', value: stats.lastActivityAt.toString(), type: 'uint64' },
      { name: 'mostUsedAction', value: stats.mostUsedAction, type: 'string' },
    ]);

    console.log(`📊 [STATS] Updating user stats: ${userWallet.slice(0, 10)}...`);
    console.log(`   ✅ Success Rate: ${calculateSuccessRate(stats).toFixed(1)}%`);
    console.log(`   🏆 Reputation: ${getReputationTier(stats)}`);

    const txHash = await this.sdk.streams.set([
      {
        id: this.stringToBytes32(userWallet),
        schemaId: this.schemaIds.stats,
        data: encodedData,
      },
    ]);

    console.log(`✅ [STATS] Stats updated on-chain: ${txHash}`);
    return txHash;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userWallet: string): Promise<UserStatsData | null> {
    if (!this.schemaIds.stats) await this.initialize();

    try {
      const data = await this.sdk.streams.getByKey(
        this.schemaIds.stats,
        this.publisherAddress,
        this.stringToBytes32(userWallet)
      );

      if (!data) return null;

      const decoded = this.statsEncoder.decode(data);
      return {
        userWallet: decoded[0],
        totalTransactions: BigInt(decoded[1]),
        successfulTransactions: BigInt(decoded[2]),
        failedTransactions: BigInt(decoded[3]),
        totalVolume: BigInt(decoded[4]),
        firstActivityAt: BigInt(decoded[5]),
        lastActivityAt: BigInt(decoded[6]),
        mostUsedAction: decoded[7],
      };
    } catch (error) {
      console.error('Error reading user stats:', error);
      return null;
    }
  }

  // ========================================
  // USE CASE 4: EXECUTION PROOFS
  // ========================================

  /**
   * Create an execution proof linking intent to actual execution
   */
  async createExecutionProof(
    intentId: string,
    txHash: string,
    scheduledTime: bigint,
    expectedAmount: bigint,
    actualAmount: bigint,
    success: boolean
  ): Promise<string> {
    if (!this.schemaIds.proof) await this.initialize();

    const actualExecutionTime = BigInt(Math.floor(Date.now() / 1000));
    const timeDelta = actualExecutionTime - scheduledTime;
    const proofId = `proof-${intentId}-${actualExecutionTime}`;
    const verificationHash = createVerificationHash(intentId, txHash, actualAmount);

    const proofData: ExecutionProofData = {
      proofId,
      intentId,
      txHash,
      scheduledTime,
      actualExecutionTime,
      timeDelta,
      executionStatus: success ? 'success' : 'failed',
      expectedAmount,
      actualAmount,
      verificationHash,
    };

    const encodedData = this.proofEncoder.encodeData([
      { name: 'proofId', value: this.stringToBytes32(proofData.proofId), type: 'bytes32' },
      { name: 'intentId', value: this.stringToBytes32(proofData.intentId), type: 'bytes32' },
      { name: 'txHash', value: this.stringToBytes32(proofData.txHash), type: 'bytes32' },
      { name: 'scheduledTime', value: proofData.scheduledTime.toString(), type: 'uint64' },
      { name: 'actualExecutionTime', value: proofData.actualExecutionTime.toString(), type: 'uint64' },
      { name: 'timeDelta', value: proofData.timeDelta.toString(), type: 'int64' },
      { name: 'executionStatus', value: proofData.executionStatus, type: 'string' },
      { name: 'expectedAmount', value: proofData.expectedAmount.toString(), type: 'uint256' },
      { name: 'actualAmount', value: proofData.actualAmount.toString(), type: 'uint256' },
      { name: 'verificationHash', value: proofData.verificationHash, type: 'string' },
    ]);

    console.log(`🔐 [PROOF] Creating execution proof: ${proofId}`);
    console.log(`   ⏱️ Time Delta: ${formatTimeDelta(timeDelta)}`);
    console.log(`   ✅ On Time: ${wasOnTime(timeDelta) ? 'YES' : 'NO'}`);

    const resultHash = await this.sdk.streams.set([
      {
        id: this.stringToBytes32(proofId),
        schemaId: this.schemaIds.proof,
        data: encodedData,
      },
    ]);

    console.log(`✅ [PROOF] Execution proof recorded: ${resultHash}`);
    return resultHash;
  }

  /**
   * Verify an execution proof
   */
  async verifyExecutionProof(proofId: string): Promise<{
    valid: boolean;
    onTime: boolean;
    timeDelta: string;
    proof?: ExecutionProofData;
  }> {
    if (!this.schemaIds.proof) await this.initialize();

    try {
      const data = await this.sdk.streams.getByKey(
        this.schemaIds.proof,
        this.publisherAddress,
        this.stringToBytes32(proofId)
      );

      if (!data) {
        return { valid: false, onTime: false, timeDelta: 'N/A' };
      }

      const decoded = this.proofEncoder.decode(data);
      const proof: ExecutionProofData = {
        proofId: decoded[0],
        intentId: decoded[1],
        txHash: decoded[2],
        scheduledTime: BigInt(decoded[3]),
        actualExecutionTime: BigInt(decoded[4]),
        timeDelta: BigInt(decoded[5]),
        executionStatus: decoded[6],
        expectedAmount: BigInt(decoded[7]),
        actualAmount: BigInt(decoded[8]),
        verificationHash: decoded[9],
      };

      // Verify the hash
      const expectedHash = createVerificationHash(
        proof.intentId,
        proof.txHash,
        proof.actualAmount
      );
      const valid = proof.verificationHash === expectedHash;

      return {
        valid,
        onTime: wasOnTime(proof.timeDelta),
        timeDelta: formatTimeDelta(proof.timeDelta),
        proof,
      };
    } catch (error) {
      console.error('Error verifying proof:', error);
      return { valid: false, onTime: false, timeDelta: 'Error' };
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private stringToBytes32(input: string): `0x${string}` {
    if (!input) {
      return `0x${'0'.repeat(64)}`;
    }

    if (input.startsWith('0x') && input.length === 66) {
      return input as `0x${string}`;
    }

    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return `0x${hash}` as `0x${string}`;
  }

  getPublisherAddress(): string {
    return this.publisherAddress;
  }

  getSchemaIds() {
    return this.schemaIds;
  }
}

export default EnhancedDataStreamsService;

