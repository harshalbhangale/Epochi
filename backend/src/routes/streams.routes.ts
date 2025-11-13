import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import DataStreamsService from '../services/blockchain/DataStreamsService';
import { TransactionStatus } from '../schemas/transaction.schema';
import crypto from 'crypto';

// Load environment variables before instantiating service
dotenv.config();

const router = Router();

// Generate a private key for the service (in production, use environment variable)
const generateServiceKey = (): `0x${string}` => {
  const secret = process.env.ENCRYPTION_KEY || 'epochi-service-key';
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return `0x${hash}` as `0x${string}`;
};

const servicePrivateKey = generateServiceKey();
const dataStreamsService = new DataStreamsService(servicePrivateKey);

// Initialize on startup
dataStreamsService.initialize().catch((error) => {
  console.error('Failed to initialize Data Streams Service:', error);
});

/**
 * POST /api/streams/transaction
 * Write a transaction record to Data Streams
 */
router.post('/transaction', async (req: Request, res: Response) => {
  try {
    const {
      calendarId,
      eventId,
      userWallet,
      fromToken,
      toToken,
      amount,
      amountReceived,
      txHash,
      status,
      notes
    } = req.body;

    if (!calendarId || !eventId || !userWallet || !fromToken || !toToken || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: calendarId, eventId, userWallet, fromToken, toToken, amount'
      });
    }

    // Create transaction record
    const txRecord = dataStreamsService.createTransactionRecord(
      calendarId,
      eventId,
      userWallet,
      fromToken,
      toToken,
      BigInt(amount),
      amountReceived ? BigInt(amountReceived) : BigInt(0),
      txHash || '',
      status || TransactionStatus.PENDING,
      notes || ''
    );

    // Write to Data Streams
    const streamTxHash = await dataStreamsService.writeTransaction(txRecord);

    return res.json({
      success: true,
      message: 'Transaction written to Data Streams',
      transactionId: txRecord.transactionId,
      streamTxHash,
      explorerUrl: `https://somnia.explorer.caldera.xyz/tx/${streamTxHash}`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to write to Data Streams'
    });
  }
});

/**
 * GET /api/streams/transaction/:transactionId
 * Read a transaction record from Data Streams
 */
router.get('/transaction/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { publisherAddress } = req.query;

    if (!publisherAddress || typeof publisherAddress !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Publisher address is required as query parameter'
      });
    }

    const transaction = await dataStreamsService.readTransaction(
      transactionId,
      publisherAddress
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    return res.json({
      success: true,
      transaction: {
        ...transaction,
        timestamp: transaction.timestamp.toString(),
        amount: transaction.amount.toString(),
        amountReceived: transaction.amountReceived.toString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to read from Data Streams'
    });
  }
});

/**
 * GET /api/streams/transactions/:publisherAddress
 * Get all transactions for a publisher
 */
router.get('/transactions/:publisherAddress', async (req: Request, res: Response) => {
  try {
    const { publisherAddress } = req.params;

    const transactions = await dataStreamsService.getAllTransactions(publisherAddress);

    return res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(tx => ({
        ...tx,
        timestamp: tx.timestamp.toString(),
        amount: tx.amount.toString(),
        amountReceived: tx.amountReceived.toString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transactions'
    });
  }
});

/**
 * GET /api/streams/schema
 * Get schema information
 */
router.get('/schema', async (_req: Request, res: Response) => {
  try {
    const schemaId = dataStreamsService.getSchemaId();
    const publisherAddress = dataStreamsService.getPublisherAddress();

    return res.json({
      success: true,
      schemaId,
      publisherAddress,
      schema: {
        fields: [
          'timestamp (uint64)',
          'transactionId (bytes32)',
          'userWallet (address)',
          'calendarId (string)',
          'eventId (string)',
          'transactionType (string)',
          'fromToken (string)',
          'toToken (string)',
          'amount (uint256)',
          'amountReceived (uint256)',
          'txHash (bytes32)',
          'status (string)',
          'notes (string)'
        ]
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get schema info'
    });
  }
});

/**
 * GET /api/streams/publisher
 * Get publisher address (for convenience)
 */
router.get('/publisher', (_req: Request, res: Response) => {
  try {
    const publisherAddress = dataStreamsService.getPublisherAddress();

    return res.json({
      success: true,
      publisherAddress
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get publisher address'
    });
  }
});

export { router as streamsRouter, dataStreamsService };

