import { Router, Request, Response } from 'express';
import EnhancedDataStreamsService from '../services/blockchain/EnhancedDataStreamsService';
import { IntentStatus, createIntentId } from '../schemas/scheduled-intent.schema';
import { parseEther } from 'viem';

const router = Router();

// Initialize Enhanced Data Streams Service
const privateKey = process.env.PUBLISHER_PRIVATE_KEY || 
  '0x0123456789012345678901234567890123456789012345678901234567890123';
const dataStreamsService = new EnhancedDataStreamsService(privateKey);

// Initialize on first request
let initialized = false;
const ensureInitialized = async () => {
  if (!initialized) {
    await dataStreamsService.initialize();
    initialized = true;
  }
};

/**
 * GET /api/data-streams/info
 * Get Data Streams service information
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    res.json({
      success: true,
      info: {
        publisher: dataStreamsService.getPublisherAddress(),
        schemas: dataStreamsService.getSchemaIds(),
        useCases: [
          {
            name: 'Transaction Audit Trail',
            description: 'Immutable record of all executed transactions',
            schema: 'transaction',
          },
          {
            name: 'Scheduled Intent Registry',
            description: 'Pre-announce transactions before execution for transparency',
            schema: 'intent',
          },
          {
            name: 'User Reputation System',
            description: 'On-chain activity metrics and trust scores',
            schema: 'stats',
          },
          {
            name: 'Execution Proofs',
            description: 'Cryptographic verification of scheduled execution timing',
            schema: 'proof',
          },
        ],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-streams/intent
 * Announce a scheduled transaction intent
 */
router.post('/intent', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    const {
      userWallet,
      scheduledTime,
      transactionType,
      fromToken,
      toToken,
      amount,
      description,
    } = req.body;

    if (!userWallet || !scheduledTime || !transactionType || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, scheduledTime, transactionType, amount',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const intentId = createIntentId(userWallet, scheduledTime, now);

    const txHash = await dataStreamsService.announceIntent({
      scheduledTime: BigInt(scheduledTime),
      intentId,
      userWallet,
      transactionType,
      fromToken: fromToken || 'STT',
      toToken: toToken || '',
      amount: parseEther(amount.toString()),
      description: description || `${transactionType} ${amount} ${fromToken || 'STT'}`,
      createdAt: BigInt(now),
      status: IntentStatus.SCHEDULED,
    });

    res.json({
      success: true,
      intentId,
      txHash,
      message: 'Intent announced on Data Streams',
      scheduledFor: new Date(scheduledTime * 1000).toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data-streams/intent/:intentId
 * Get a scheduled intent by ID
 */
router.get('/intent/:intentId', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    const { intentId } = req.params;
    const intent = await dataStreamsService.getIntent(intentId);

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'Intent not found',
      });
    }

    res.json({
      success: true,
      intent: {
        ...intent,
        scheduledTime: Number(intent.scheduledTime),
        amount: intent.amount.toString(),
        createdAt: Number(intent.createdAt),
        scheduledTimeFormatted: new Date(Number(intent.scheduledTime) * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data-streams/stats/:userWallet
 * Get user statistics and reputation
 */
router.get('/stats/:userWallet', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    const { userWallet } = req.params;
    const stats = await dataStreamsService.getUserStats(userWallet);

    if (!stats) {
      return res.json({
        success: true,
        stats: null,
        message: 'No activity recorded for this wallet',
      });
    }

    // Import helper functions
    const { calculateSuccessRate, getReputationTier } = require('../../schemas/user-stats.schema');

    res.json({
      success: true,
      stats: {
        userWallet: stats.userWallet,
        totalTransactions: Number(stats.totalTransactions),
        successfulTransactions: Number(stats.successfulTransactions),
        failedTransactions: Number(stats.failedTransactions),
        totalVolume: stats.totalVolume.toString(),
        firstActivityAt: Number(stats.firstActivityAt),
        lastActivityAt: Number(stats.lastActivityAt),
        mostUsedAction: stats.mostUsedAction,
        successRate: calculateSuccessRate(stats).toFixed(1) + '%',
        reputationTier: getReputationTier(stats),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data-streams/proof/:proofId
 * Verify an execution proof
 */
router.get('/proof/:proofId', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    const { proofId } = req.params;
    const result = await dataStreamsService.verifyExecutionProof(proofId);

    res.json({
      success: true,
      verification: {
        valid: result.valid,
        onTime: result.onTime,
        timeDelta: result.timeDelta,
        proof: result.proof ? {
          ...result.proof,
          scheduledTime: Number(result.proof.scheduledTime),
          actualExecutionTime: Number(result.proof.actualExecutionTime),
          timeDelta: Number(result.proof.timeDelta),
          expectedAmount: result.proof.expectedAmount.toString(),
          actualAmount: result.proof.actualAmount.toString(),
        } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/data-streams/demo
 * Run a complete demo of all Data Streams use cases
 */
router.post('/demo', async (req: Request, res: Response) => {
  try {
    await ensureInitialized();
    
    const results: any = {
      success: true,
      demo: {},
    };

    const demoWallet = '0x' + '1'.repeat(40);
    const now = Math.floor(Date.now() / 1000);
    const scheduledTime = now + 60; // 1 minute from now

    // Step 1: Announce Intent
    console.log('\n🎭 DEMO: Running Data Streams demonstration...\n');
    
    const intentId = createIntentId(demoWallet, scheduledTime, now);
    const intentTx = await dataStreamsService.announceIntent({
      scheduledTime: BigInt(scheduledTime),
      intentId,
      userWallet: demoWallet,
      transactionType: 'transfer',
      fromToken: 'STT',
      toToken: '0x' + '2'.repeat(40),
      amount: parseEther('1.0'),
      description: 'Demo: Transfer 1.0 STT',
      createdAt: BigInt(now),
      status: IntentStatus.SCHEDULED,
    });

    results.demo.intent = {
      step: '1. Intent Announced',
      intentId,
      txHash: intentTx,
      description: 'Pre-announced scheduled transaction on-chain',
    };

    // Step 2: Record Transaction
    const { createTransactionId, TransactionStatus, TransactionType } = require('../../schemas/transaction.schema');
    const transactionId = createTransactionId('demo-calendar', 'demo-event', now);
    
    await dataStreamsService.recordTransaction({
      timestamp: BigInt(now),
      transactionId,
      userWallet: demoWallet,
      calendarId: 'demo-calendar',
      eventId: 'demo-event',
      transactionType: TransactionType.TRANSFER,
      fromToken: 'STT',
      toToken: '0x' + '2'.repeat(40),
      amount: parseEther('1.0'),
      amountReceived: parseEther('1.0'),
      txHash: '0x' + 'abc'.repeat(21) + 'def',
      status: TransactionStatus.EXECUTED,
      notes: 'Demo transaction',
    });

    results.demo.transaction = {
      step: '2. Transaction Recorded',
      transactionId,
      description: 'Immutable audit trail created',
    };

    // Step 3: Update User Stats
    await dataStreamsService.updateUserStats(
      demoWallet,
      true,
      parseEther('1.0'),
      'transfer'
    );

    const stats = await dataStreamsService.getUserStats(demoWallet);
    const { calculateSuccessRate, getReputationTier } = require('../../schemas/user-stats.schema');

    results.demo.stats = {
      step: '3. User Stats Updated',
      successRate: stats ? calculateSuccessRate(stats).toFixed(1) + '%' : '100%',
      reputation: stats ? getReputationTier(stats) : '🌱 Newcomer',
      description: 'On-chain reputation updated',
    };

    // Step 4: Create Execution Proof
    const proofTx = await dataStreamsService.createExecutionProof(
      intentId,
      '0x' + 'abc'.repeat(21) + 'def',
      BigInt(scheduledTime),
      parseEther('1.0'),
      parseEther('1.0'),
      true
    );

    results.demo.proof = {
      step: '4. Execution Proof Created',
      txHash: proofTx,
      description: 'Cryptographic proof of on-time execution',
    };

    console.log('\n✅ DEMO: All Data Streams use cases demonstrated!\n');

    res.json(results);
  } catch (error: any) {
    console.error('Demo error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as dataStreamsRouter, dataStreamsService };

