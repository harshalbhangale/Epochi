# 📊 Chunk 4: Somnia Data Streams Integration

In this chunk, you'll integrate Somnia Data Streams - an immutable, on-chain data layer that records all your transactions with cryptographic proof.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Somnia Data Streams SDK installed
- Transaction schemas designed
- DataStreamsService implementation
- Ability to write transaction records on-chain
- Ability to read transaction history
- Complete verifiable audit trail

## 📋 Prerequisites

- Completed [Chunk 1: Project Setup](01-project-setup.md)
- Completed [Chunk 2: Google Calendar Integration](02-google-calendar-setup.md)
- Completed [Chunk 3: Somnia Wallet Service](03-somnia-wallet-service.md)
- Backend server running
- Testnet wallet with STT tokens

## 🌊 Step 1: Understanding Somnia Data Streams

### What are Data Streams?

Somnia Data Streams is a built-in protocol for storing structured data on-chain:

**Traditional Approach:**
```
Deploy Smart Contract → Write custom storage logic → Index with subgraph
```

**Data Streams Approach:**
```
Define Schema → Write data → Read data (automatic decoding)
```

**Benefits:**
- ✅ No smart contract needed
- ✅ Automatic schema validation
- ✅ Built-in indexing
- ✅ Composable (other apps can read your data)
- ✅ Immutable and verifiable

### Key Concepts

**Schema**: Defines data structure (like a database table schema)
```typescript
"uint64 timestamp, address user, string action, uint256 amount"
```

**Schema ID**: Unique identifier computed from schema string
```typescript
schemaId = keccak256(schemaString)
```

**Data ID**: Unique key for each record
```typescript
dataId = toHex("transaction-123")
```

**Publisher**: Wallet address that wrote the data (msg.sender)

## 📦 Step 2: Install Somnia Data Streams SDK

```bash
cd tempora/backend
npm install @somnia-chain/streams
```

## 📝 Step 3: Define Transaction Schema

Create `backend/src/schemas/transaction.schema.ts`:

```typescript
/**
 * Schema definitions for Somnia Data Streams
 */

/**
 * Transaction Record Schema
 * Stores information about each swap transaction
 */
export const TRANSACTION_SCHEMA = `
  uint64 timestamp,
  bytes32 transactionId,
  address userWallet,
  string calendarId,
  string eventId,
  string transactionType,
  string fromToken,
  string toToken,
  uint256 amount,
  uint256 amountReceived,
  bytes32 txHash,
  string status,
  string notes
` as const;

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
```

## 🔧 Step 4: Create Data Streams Service

Create `backend/src/services/blockchain/DataStreamsService.ts`:

```typescript
import { SDK, SchemaEncoder, toHex, zeroBytes32 } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import {
  TRANSACTION_SCHEMA,
  TransactionData,
  TransactionType,
  TransactionStatus,
  createTransactionId
} from '../../schemas/transaction.schema';

/**
 * Somnia Testnet chain configuration
 */
const somniaTestnet = defineChain({
  id: 50311,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Test Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia.explorer.caldera.xyz',
    },
  },
  testnet: true,
});

/**
 * DataStreamsService handles all Data Streams operations
 */
export class DataStreamsService {
  private sdk: any;
  private schemaEncoder: SchemaEncoder;
  private schemaId: string = '';

  constructor(privateKey: string) {
    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create public client
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(),
    });

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(),
    });

    // Initialize SDK
    this.sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    // Initialize schema encoder
    this.schemaEncoder = new SchemaEncoder(TRANSACTION_SCHEMA);

    console.log('✅ Data Streams Service initialized');
    console.log(`📍 Publisher address: ${account.address}`);
  }

  /**
   * Compute schema ID (must be called after initialization)
   */
  async initialize(): Promise<void> {
    try {
      this.schemaId = await this.sdk.streams.computeSchemaId(TRANSACTION_SCHEMA);
      console.log(`🔑 Schema ID: ${this.schemaId}`);
    } catch (error) {
      console.error('❌ Error computing schema ID:', error);
      throw error;
    }
  }

  /**
   * Write transaction record to Data Streams
   */
  async writeTransaction(data: TransactionData): Promise<string> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      // Encode the data
      const encodedData = this.schemaEncoder.encodeData([
        { name: 'timestamp', value: data.timestamp.toString(), type: 'uint64' },
        { name: 'transactionId', value: toHex(data.transactionId, { size: 32 }), type: 'bytes32' },
        { name: 'userWallet', value: data.userWallet, type: 'address' },
        { name: 'calendarId', value: data.calendarId, type: 'string' },
        { name: 'eventId', value: data.eventId, type: 'string' },
        { name: 'transactionType', value: data.transactionType, type: 'string' },
        { name: 'fromToken', value: data.fromToken, type: 'string' },
        { name: 'toToken', value: data.toToken, type: 'string' },
        { name: 'amount', value: data.amount.toString(), type: 'uint256' },
        { name: 'amountReceived', value: data.amountReceived.toString(), type: 'uint256' },
        { name: 'txHash', value: toHex(data.txHash, { size: 32 }), type: 'bytes32' },
        { name: 'status', value: data.status, type: 'string' },
        { name: 'notes', value: data.notes, type: 'string' },
      ]);

      console.log(`📝 Writing transaction to Data Streams: ${data.transactionId}`);

      // Write to Data Streams
      const txHash = await this.sdk.streams.set([
        {
          id: toHex(data.transactionId, { size: 32 }),
          schemaId: this.schemaId,
          data: encodedData,
        },
      ]);

      console.log(`✅ Transaction written to Data Streams: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Error writing to Data Streams:', error);
      throw error;
    }
  }

  /**
   * Read transaction record from Data Streams
   */
  async readTransaction(
    transactionId: string,
    publisherAddress: string
  ): Promise<TransactionData | null> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      const dataKey = toHex(transactionId, { size: 32 });

      console.log(`📖 Reading transaction from Data Streams: ${transactionId}`);

      // Read from Data Streams
      const data = await this.sdk.streams.getByKey(
        this.schemaId,
        publisherAddress,
        dataKey
      );

      if (!data) {
        console.log(`ℹ️ No data found for transaction: ${transactionId}`);
        return null;
      }

      // Decode the data
      const decoded = this.schemaEncoder.decode(data);

      console.log(`✅ Transaction read from Data Streams: ${transactionId}`);

      // Map to TransactionData interface
      return {
        timestamp: BigInt(decoded[0]),
        transactionId: decoded[1],
        userWallet: decoded[2],
        calendarId: decoded[3],
        eventId: decoded[4],
        transactionType: decoded[5] as TransactionType,
        fromToken: decoded[6],
        toToken: decoded[7],
        amount: BigInt(decoded[8]),
        amountReceived: BigInt(decoded[9]),
        txHash: decoded[10],
        status: decoded[11] as TransactionStatus,
        notes: decoded[12],
      };
    } catch (error) {
      console.error('❌ Error reading from Data Streams:', error);
      return null;
    }
  }

  /**
   * Get all transactions for a publisher
   */
  async getAllTransactions(publisherAddress: string): Promise<TransactionData[]> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      console.log(`📚 Getting all transactions for publisher: ${publisherAddress}`);

      // Get all data for schema and publisher
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(
        this.schemaId,
        publisherAddress
      );

      if (!allData || allData.length === 0) {
        console.log(`ℹ️ No transactions found for publisher: ${publisherAddress}`);
        return [];
      }

      // Decode all records
      const transactions: TransactionData[] = allData.map((record: any) => {
        const decoded = this.schemaEncoder.decode(record.data);
        
        return {
          timestamp: BigInt(decoded[0]),
          transactionId: decoded[1],
          userWallet: decoded[2],
          calendarId: decoded[3],
          eventId: decoded[4],
          transactionType: decoded[5] as TransactionType,
          fromToken: decoded[6],
          toToken: decoded[7],
          amount: BigInt(decoded[8]),
          amountReceived: BigInt(decoded[9]),
          txHash: decoded[10],
          status: decoded[11] as TransactionStatus,
          notes: decoded[12],
        };
      });

      console.log(`✅ Found ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting all transactions:', error);
      return [];
    }
  }

  /**
   * Get schema ID
   */
  getSchemaId(): string {
    return this.schemaId;
  }

  /**
   * Create a transaction record helper
   */
  createTransactionRecord(
    calendarId: string,
    eventId: string,
    userWallet: string,
    fromToken: string,
    toToken: string,
    amount: bigint,
    amountReceived: bigint = BigInt(0),
    txHash: string = '',
    status: TransactionStatus = TransactionStatus.PENDING,
    notes: string = ''
  ): TransactionData {
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const transactionId = createTransactionId(calendarId, eventId, Number(timestamp));

    return {
      timestamp,
      transactionId,
      userWallet,
      calendarId,
      eventId,
      transactionType: TransactionType.SWAP,
      fromToken,
      toToken,
      amount,
      amountReceived,
      txHash,
      status,
      notes,
    };
  }
}

export default DataStreamsService;
```

## 🛣️ Step 5: Create Data Streams Routes

Create `backend/src/routes/streams.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import DataStreamsService from '../services/blockchain/DataStreamsService';
import { TransactionStatus } from '../schemas/transaction.schema';
import crypto from 'crypto';

const router = Router();

// Generate a private key for the service (in production, use environment variable)
const generateServiceKey = (): `0x${string}` => {
  const secret = process.env.ENCRYPTION_KEY || 'tempora-service-key';
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return `0x${hash}` as `0x${string}`;
};

const servicePrivateKey = generateServiceKey();
const dataStreamsService = new DataStreamsService(servicePrivateKey);

// Initialize on startup
dataStreamsService.initialize().catch(console.error);

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
        error: 'Missing required fields'
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

    res.json({
      success: true,
      message: 'Transaction written to Data Streams',
      transactionId: txRecord.transactionId,
      streamTxHash,
      explorerUrl: `https://somnia.explorer.caldera.xyz/tx/${streamTxHash}`
    });
  } catch (error: any) {
    res.status(500).json({
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
        error: 'Publisher address is required'
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

    res.json({
      success: true,
      transaction: {
        ...transaction,
        timestamp: transaction.timestamp.toString(),
        amount: transaction.amount.toString(),
        amountReceived: transaction.amountReceived.toString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get transactions'
    });
  }
});

/**
 * GET /api/streams/schema
 * Get schema information
 */
router.get('/schema', async (req: Request, res: Response) => {
  try {
    const schemaId = dataStreamsService.getSchemaId();

    res.json({
      success: true,
      schemaId,
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
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get schema info'
    });
  }
});

export { router as streamsRouter, dataStreamsService };
```

## 🔌 Step 6: Integrate Streams Routes with Server

Update `backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { calendarRouter } from './routes/calendar.routes';
import { walletRouter } from './routes/wallet.routes';
import { streamsRouter } from './routes/streams.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Create logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'tempora-backend' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Tempora Backend',
    version: '1.0.0',
    network: 'Somnia Testnet'
  });
});

// API routes
app.use('/api/calendar', calendarRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/streams', streamsRouter);

// Redirect /auth to /api/calendar/auth
app.get('/auth', (req: Request, res: Response) => {
  res.redirect('/api/calendar/auth');
});

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendar: '/api/calendar/*',
      wallet: '/api/wallet/*',
      streams: '/api/streams/*'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Tempora backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Network: Somnia Testnet`);
  logger.info(`💡 Health: http://localhost:${PORT}/health`);
  logger.info(`📅 Calendar: http://localhost:${PORT}/api/calendar/auth`);
  logger.info(`💰 Wallet: http://localhost:${PORT}/api/wallet/:calendarId`);
  logger.info(`📊 Streams: http://localhost:${PORT}/api/streams/schema`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
```

## 🧪 Step 7: Test Data Streams Integration

### Start the Backend

```bash
cd tempora/backend
npm run dev
```

### Test Schema Info

```bash
curl http://localhost:3001/api/streams/schema
```

Expected response:
```json
{
  "success": true,
  "schemaId": "0x1234abcd...",
  "schema": {
    "fields": [
      "timestamp (uint64)",
      "transactionId (bytes32)",
      "userWallet (address)",
      "calendarId (string)",
      "eventId (string)",
      "transactionType (string)",
      "fromToken (string)",
      "toToken (string)",
      "amount (uint256)",
      "amountReceived (uint256)",
      "txHash (bytes32)",
      "status (string)",
      "notes (string)"
    ]
  }
}
```

### Write a Test Transaction

```bash
curl -X POST http://localhost:3001/api/streams/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "calendarId": "primary",
    "eventId": "test-event-123",
    "userWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEe8",
    "fromToken": "ETH",
    "toToken": "USDC",
    "amount": "1000000000000000000",
    "amountReceived": "2450000000",
    "txHash": "0xabc123def456...",
    "status": "executed",
    "notes": "Test swap transaction"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Transaction written to Data Streams",
  "transactionId": "primary-test-event-123-1234567890",
  "streamTxHash": "0xdef789...",
  "explorerUrl": "https://somnia.explorer.caldera.xyz/tx/0xdef789..."
}
```

### Read the Transaction Back

```bash
curl "http://localhost:3001/api/streams/transaction/primary-test-event-123-1234567890?publisherAddress=0xYOUR_SERVICE_ADDRESS"
```

Expected response:
```json
{
  "success": true,
  "transaction": {
    "timestamp": "1234567890",
    "transactionId": "primary-test-event-123-1234567890",
    "userWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEe8",
    "calendarId": "primary",
    "eventId": "test-event-123",
    "transactionType": "swap",
    "fromToken": "ETH",
    "toToken": "USDC",
    "amount": "1000000000000000000",
    "amountReceived": "2450000000",
    "txHash": "0xabc123def456...",
    "status": "executed",
    "notes": "Test swap transaction"
  }
}
```

### Get All Transactions

```bash
curl http://localhost:3001/api/streams/transactions/0xYOUR_SERVICE_ADDRESS
```

## 🎉 What You've Built

Congratulations! You now have:

✅ Somnia Data Streams SDK integrated
✅ Transaction schema defined
✅ Complete DataStreamsService implementation
✅ Ability to write transaction records on-chain
✅ Ability to read transaction history
✅ Immutable audit trail for all transactions
✅ API routes for Data Streams operations
✅ Schema validation and encoding/decoding

## 📁 New Files Created

```
backend/
├── src/
│   ├── services/
│   │   └── blockchain/
│   │       └── DataStreamsService.ts ✅ (400+ lines)
│   ├── routes/
│   │   └── streams.routes.ts ✅ (200+ lines)
│   ├── schemas/
│   │   └── transaction.schema.ts ✅ (80+ lines)
│   └── server.ts ✅ (updated)
```

## 🔍 Key Concepts Explained

### Schema Design Best Practices

**Good Schema:**
```typescript
"uint64 timestamp, address user, uint256 amount"
```

**Why:**
- Use appropriate types (uint64 for timestamps, address for wallets)
- Keep field names descriptive
- Order fields logically

**Avoid:**
```typescript
"string everything, string data, string more"
```

### Data ID Strategy

**For unique records:**
```typescript
dataId = hash(calendarId + eventId + timestamp)
```

**For updatable records:**
```typescript
dataId = hash(calendarId + eventId)  // Same ID = update
```

### Publisher = Data Owner

- Publisher address = msg.sender (wallet that writes data)
- Only publisher can update their data
- Anyone can read if they know schema ID + publisher + data ID

## 🐛 Common Issues & Solutions

### Issue: "Schema ID not computed"
**Solution:**
Ensure `initialize()` is called:
```typescript
await dataStreamsService.initialize();
```

### Issue: "Failed to write to Data Streams"
**Solution:**
Check wallet has sufficient gas:
```bash
curl http://localhost:3001/api/wallet/primary
```

### Issue: "Data not found when reading"
**Solution:**
Verify you're using correct publisher address:
```bash
# Publisher is the service wallet address, not user wallet
curl http://localhost:3001/api/streams/schema
```

### Issue: Encoding errors
**Solution:**
Ensure data types match schema exactly:
```typescript
// Schema says uint256, provide bigint
amount: BigInt("1000000000000000000")

// Schema says address, provide string
userWallet: "0x742d35..."
```

## 📖 Next Steps

In the next chunk, you'll:
1. Parse calendar events for swap patterns
2. Execute token swaps on-chain
3. Record transactions to Data Streams
4. Update calendar events with results
5. Implement complete TransactionExecutor

**Continue to:** [Chunk 5: Transaction Execution System →](05-transaction-execution.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

