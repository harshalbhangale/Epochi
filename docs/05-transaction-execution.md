# 🔄 Chunk 5: Transaction Execution System

In this chunk, you'll build the transaction execution system that parses calendar events, validates transactions, executes swaps, and records everything to Data Streams.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Event parser that detects swap patterns
- Transaction validator
- Swap executor (simplified for MVP)
- Complete TransactionExecutor service
- Calendar event updater with transaction results
- Full transaction lifecycle management

## 📋 Prerequisites

- Completed [Chunk 1: Project Setup](01-project-setup.md)
- Completed [Chunk 2: Google Calendar Integration](02-google-calendar-setup.md)
- Completed [Chunk 3: Somnia Wallet Service](03-somnia-wallet-service.md)
- Completed [Chunk 4: Data Streams Integration](04-data-streams-setup.md)

## 🎯 Step 1: Understanding Transaction Flow

### Complete Flow Diagram

```
1. Calendar Event Created
   "Swap 0.1 ETH to USDC at 3pm"
   ↓
2. Event Parser Detects Pattern
   ✓ Valid swap format
   ✓ Extracts: amount=0.1, from=ETH, to=USDC, time=3pm
   ↓
3. Validate Transaction
   ✓ Check wallet balance
   ✓ Estimate gas
   ✓ Verify tokens exist
   ↓
4. Wait Until Execution Time
   (Agent monitors continuously)
   ↓
5. Execute Swap
   • Send transaction to DEX
   • Wait for confirmation
   ↓
6. Record to Data Streams
   • Write immutable record
   • Get stream transaction hash
   ↓
7. Update Calendar Event
   • Add transaction hash
   • Add explorer link
   • Mark as complete
```

## 📝 Step 2: Create Event Parser

Create `backend/src/services/calendar/EventParser.ts`:

```typescript
import { calendar_v3 } from 'googleapis';

/**
 * Parsed transaction intent from calendar event
 */
export interface ParsedTransaction {
  valid: boolean;
  type: 'swap' | 'transfer' | 'unknown';
  fromToken: string;
  toToken: string;
  amount: string;
  executionTime: Date;
  eventId: string;
  eventTitle: string;
  error?: string;
}

/**
 * EventParser extracts transaction intents from calendar event titles
 */
export class EventParser {
  /**
   * Parse a calendar event for transaction intent
   */
  static parseEvent(event: calendar_v3.Schema$Event): ParsedTransaction {
    const eventId = event.id || '';
    const eventTitle = event.summary || '';
    const startTime = event.start?.dateTime || event.start?.date;

    if (!startTime) {
      return {
        valid: false,
        type: 'unknown',
        fromToken: '',
        toToken: '',
        amount: '',
        executionTime: new Date(),
        eventId,
        eventTitle,
        error: 'No start time found'
      };
    }

    const executionTime = new Date(startTime);

    // Check if title contains swap pattern
    if (this.isSwapPattern(eventTitle)) {
      return this.parseSwapEvent(eventTitle, executionTime, eventId);
    }

    // Check if title contains transfer pattern
    if (this.isTransferPattern(eventTitle)) {
      return this.parseTransferEvent(eventTitle, executionTime, eventId);
    }

    return {
      valid: false,
      type: 'unknown',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle,
      error: 'No recognized transaction pattern'
    };
  }

  /**
   * Check if event title matches swap pattern
   * Patterns: "Swap 0.1 ETH to USDC", "swap 1 ETH for USDC", "0.1 ETH -> USDC"
   */
  private static isSwapPattern(title: string): boolean {
    const patterns = [
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(to|for|->)\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+->\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
    ];

    return patterns.some(pattern => pattern.test(title));
  }

  /**
   * Check if event title matches transfer pattern
   * Patterns: "Send 0.1 ETH to 0x123...", "Transfer 100 USDC to 0xabc..."
   */
  private static isTransferPattern(title: string): boolean {
    const pattern = /(send|transfer)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
    return pattern.test(title);
  }

  /**
   * Parse swap event details
   */
  private static parseSwapEvent(
    title: string,
    executionTime: Date,
    eventId: string
  ): ParsedTransaction {
    // Try different swap patterns
    const patterns = [
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(to|for|->)\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+->\s+(\w+)/i,
      /(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const amount = match[1];
        const fromToken = match[2].toUpperCase();
        const toToken = match[match.length - 1].toUpperCase();

        return {
          valid: true,
          type: 'swap',
          fromToken,
          toToken,
          amount,
          executionTime,
          eventId,
          eventTitle: title
        };
      }
    }

    return {
      valid: false,
      type: 'swap',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle: title,
      error: 'Failed to parse swap details'
    };
  }

  /**
   * Parse transfer event details
   */
  private static parseTransferEvent(
    title: string,
    executionTime: Date,
    eventId: string
  ): ParsedTransaction {
    const pattern = /(send|transfer)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
    const match = title.match(pattern);

    if (match) {
      const amount = match[2];
      const token = match[3].toUpperCase();
      const toAddress = match[4];

      return {
        valid: true,
        type: 'transfer',
        fromToken: token,
        toToken: toAddress, // For transfers, toToken stores recipient address
        amount,
        executionTime,
        eventId,
        eventTitle: title
      };
    }

    return {
      valid: false,
      type: 'transfer',
      fromToken: '',
      toToken: '',
      amount: '',
      executionTime,
      eventId,
      eventTitle: title,
      error: 'Failed to parse transfer details'
    };
  }

  /**
   * Validate parsed transaction
   */
  static validateTransaction(parsed: ParsedTransaction): boolean {
    if (!parsed.valid) return false;
    
    // Check amount is positive
    const amount = parseFloat(parsed.amount);
    if (isNaN(amount) || amount <= 0) {
      return false;
    }

    // Check tokens are specified
    if (!parsed.fromToken || !parsed.toToken) {
      return false;
    }

    // Check execution time is in future (with 1 minute buffer)
    const now = new Date();
    const buffer = 60 * 1000; // 1 minute
    if (parsed.executionTime.getTime() < now.getTime() - buffer) {
      return false;
    }

    return true;
  }

  /**
   * Format transaction for display
   */
  static formatTransaction(parsed: ParsedTransaction): string {
    if (parsed.type === 'swap') {
      return `Swap ${parsed.amount} ${parsed.fromToken} → ${parsed.toToken}`;
    } else if (parsed.type === 'transfer') {
      return `Transfer ${parsed.amount} ${parsed.fromToken} to ${parsed.toToken}`;
    }
    return 'Unknown transaction';
  }
}

export default EventParser;
```

## 🔧 Step 3: Create Transaction Executor

Create `backend/src/services/blockchain/TransactionExecutor.ts`:

```typescript
import { parseEther, formatEther, type Address } from 'viem';
import SomniaWalletService from './SomniaWalletService';
import DataStreamsService from './DataStreamsService';
import { TransactionStatus } from '../../schemas/transaction.schema';
import { ParsedTransaction } from '../calendar/EventParser';

/**
 * Execution result interface
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  amountReceived?: string;
  error?: string;
  streamTxHash?: string;
}

/**
 * Token addresses on Somnia (placeholder - update with real addresses)
 */
const TOKEN_ADDRESSES: { [key: string]: Address } = {
  ETH: '0x0000000000000000000000000000000000000000', // Native token
  USDC: '0x1234567890123456789012345678901234567890', // Placeholder
  USDT: '0x2345678901234567890123456789012345678901', // Placeholder
  DAI: '0x3456789012345678901234567890123456789012',  // Placeholder
};

/**
 * TransactionExecutor handles transaction execution and recording
 */
export class TransactionExecutor {
  private walletService: SomniaWalletService;
  private dataStreamsService: DataStreamsService;

  constructor(
    walletService: SomniaWalletService,
    dataStreamsService: DataStreamsService
  ) {
    this.walletService = walletService;
    this.dataStreamsService = dataStreamsService;
  }

  /**
   * Execute a parsed transaction
   */
  async executeTransaction(
    parsed: ParsedTransaction,
    calendarId: string
  ): Promise<ExecutionResult> {
    console.log(`🚀 Executing transaction: ${parsed.eventTitle}`);

    try {
      // Get wallet info
      const walletInfo = await this.walletService.getWalletInfo(calendarId);
      console.log(`💰 Wallet balance: ${walletInfo.balanceFormatted} STT`);

      // Check if execution time has arrived
      const now = new Date();
      if (parsed.executionTime > now) {
        const waitTime = Math.floor((parsed.executionTime.getTime() - now.getTime()) / 1000);
        return {
          success: false,
          error: `Transaction scheduled for ${parsed.executionTime.toISOString()} (in ${waitTime}s)`
        };
      }

      // Execute based on type
      if (parsed.type === 'swap') {
        return await this.executeSwap(parsed, calendarId, walletInfo.address);
      } else if (parsed.type === 'transfer') {
        return await this.executeTransfer(parsed, calendarId, walletInfo.address);
      }

      return {
        success: false,
        error: 'Unknown transaction type'
      };
    } catch (error: any) {
      console.error('❌ Transaction execution failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction execution failed'
      };
    }
  }

  /**
   * Execute a swap transaction (simplified for MVP)
   */
  private async executeSwap(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address
  ): Promise<ExecutionResult> {
    console.log(`🔄 Executing swap: ${parsed.amount} ${parsed.fromToken} → ${parsed.toToken}`);

    try {
      // For MVP: Simulate swap by checking balance and creating record
      // In production: Integrate with actual DEX (Uniswap V3, etc.)
      
      const amount = parseEther(parsed.amount);
      
      // Check sufficient balance
      const hasFunds = await this.walletService.hasSufficientBalance(calendarId, amount);
      if (!hasFunds) {
        return {
          success: false,
          error: 'Insufficient balance for swap'
        };
      }

      // Simulate swap execution (replace with actual DEX integration)
      console.log(`💱 Simulating swap on DEX...`);
      
      // For demo: Create a mock transaction hash
      const mockTxHash = `0x${Date.now().toString(16)}${'0'.repeat(50)}`.slice(0, 66);
      
      // Simulate amount received (mock exchange rate: 1 ETH = 2500 USDC)
      const exchangeRate = parsed.toToken === 'USDC' ? 2500 : 1;
      const amountReceived = (parseFloat(parsed.amount) * exchangeRate).toString();

      console.log(`✅ Swap executed! Received ~${amountReceived} ${parsed.toToken}`);

      // Record to Data Streams
      const streamTxHash = await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        amount,
        parseEther(amountReceived),
        mockTxHash,
        TransactionStatus.EXECUTED,
        `Swapped ${parsed.amount} ${parsed.fromToken} for ${amountReceived} ${parsed.toToken}`
      );

      return {
        success: true,
        txHash: mockTxHash,
        explorerUrl: `https://somnia.explorer.caldera.xyz/tx/${mockTxHash}`,
        amountReceived,
        streamTxHash
      };
    } catch (error: any) {
      console.error('❌ Swap execution failed:', error);
      
      // Record failed transaction to Data Streams
      await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        parseEther(parsed.amount),
        BigInt(0),
        '',
        TransactionStatus.FAILED,
        `Swap failed: ${error.message}`
      );

      return {
        success: false,
        error: error.message || 'Swap execution failed'
      };
    }
  }

  /**
   * Execute a transfer transaction
   */
  private async executeTransfer(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address
  ): Promise<ExecutionResult> {
    console.log(`💸 Executing transfer: ${parsed.amount} ${parsed.fromToken} to ${parsed.toToken}`);

    try {
      const amount = parsed.amount;
      const recipient = parsed.toToken as Address; // In transfers, toToken is the recipient address

      // Execute the transfer
      const result = await this.walletService.sendTransaction(
        calendarId,
        recipient,
        amount
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      console.log(`✅ Transfer executed! Hash: ${result.hash}`);

      // Record to Data Streams
      const streamTxHash = await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        parseEther(amount),
        parseEther(amount),
        result.hash || '',
        TransactionStatus.EXECUTED,
        `Transferred ${amount} ${parsed.fromToken} to ${recipient}`
      );

      return {
        success: true,
        txHash: result.hash,
        explorerUrl: result.explorerUrl,
        amountReceived: amount,
        streamTxHash
      };
    } catch (error: any) {
      console.error('❌ Transfer execution failed:', error);

      // Record failed transaction
      await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        parseEther(parsed.amount),
        BigInt(0),
        '',
        TransactionStatus.FAILED,
        `Transfer failed: ${error.message}`
      );

      return {
        success: false,
        error: error.message || 'Transfer execution failed'
      };
    }
  }

  /**
   * Record transaction to Data Streams
   */
  private async recordTransaction(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address,
    amount: bigint,
    amountReceived: bigint,
    txHash: string,
    status: TransactionStatus,
    notes: string
  ): Promise<string> {
    try {
      const txRecord = this.dataStreamsService.createTransactionRecord(
        calendarId,
        parsed.eventId,
        userWallet,
        parsed.fromToken,
        parsed.toToken,
        amount,
        amountReceived,
        txHash,
        status,
        notes
      );

      const streamTxHash = await this.dataStreamsService.writeTransaction(txRecord);
      console.log(`📊 Transaction recorded to Data Streams: ${streamTxHash}`);

      return streamTxHash;
    } catch (error) {
      console.error('❌ Failed to record to Data Streams:', error);
      throw error;
    }
  }

  /**
   * Get token address by symbol
   */
  private getTokenAddress(symbol: string): Address {
    return TOKEN_ADDRESSES[symbol] || TOKEN_ADDRESSES.ETH;
  }
}

export default TransactionExecutor;
```

## 🛣️ Step 4: Create Transaction Routes

Create `backend/src/routes/transaction.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { calendarService } from './calendar.routes';
import { walletService } from './wallet.routes';
import { dataStreamsService } from './streams.routes';
import EventParser from '../services/calendar/EventParser';
import TransactionExecutor from '../services/blockchain/TransactionExecutor';

const router = Router();

// Initialize transaction executor
const transactionExecutor = new TransactionExecutor(
  walletService,
  dataStreamsService
);

/**
 * POST /api/transactions/parse
 * Parse a calendar event for transaction intent
 */
router.post('/parse', async (req: Request, res: Response) => {
  try {
    const { eventTitle, startTime, eventId } = req.body;

    if (!eventTitle || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'eventTitle and startTime are required'
      });
    }

    // Create mock event object
    const event = {
      id: eventId || 'test-event',
      summary: eventTitle,
      start: { dateTime: startTime }
    };

    // Parse the event
    const parsed = EventParser.parseEvent(event);
    const isValid = EventParser.validateTransaction(parsed);

    res.json({
      success: true,
      parsed: {
        ...parsed,
        valid: isValid,
        formatted: EventParser.formatTransaction(parsed)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse event'
    });
  }
});

/**
 * POST /api/transactions/execute
 * Execute a transaction from a calendar event
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { eventId, calendarId } = req.body;

    if (!eventId || !calendarId) {
      return res.status(400).json({
        success: false,
        error: 'eventId and calendarId are required'
      });
    }

    // Get calendar events
    const events = await calendarService.getEvents(50);
    const event = events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Parse the event
    const parsed = EventParser.parseEvent(event);
    
    if (!EventParser.validateTransaction(parsed)) {
      return res.status(400).json({
        success: false,
        error: parsed.error || 'Invalid transaction'
      });
    }

    // Execute the transaction
    const result = await transactionExecutor.executeTransaction(parsed, calendarId);

    if (result.success) {
      // Update calendar event with result
      await calendarService.appendToDescription(
        eventId,
        `
✅ Transaction Executed!
━━━━━━━━━━━━━━━━━━━━
🔗 Transaction: ${result.explorerUrl}
💰 Received: ${result.amountReceived} ${parsed.toToken}
📊 Data Stream: ${result.streamTxHash}
⏰ Executed: ${new Date().toISOString()}
        `.trim()
      );

      res.json({
        success: true,
        message: 'Transaction executed successfully',
        result
      });
    } else {
      // Update calendar event with error
      await calendarService.appendToDescription(
        eventId,
        `
❌ Transaction Failed
━━━━━━━━━━━━━━━━━━━━
Error: ${result.error}
⏰ Attempted: ${new Date().toISOString()}
        `.trim()
      );

      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute transaction'
    });
  }
});

/**
 * GET /api/transactions/pending/:calendarId
 * Get all pending transactions for a calendar
 */
router.get('/pending/:calendarId', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    // Get upcoming events
    const events = await calendarService.getEvents(50);

    // Parse and filter for valid transactions
    const pending = events
      .map(event => EventParser.parseEvent(event))
      .filter(parsed => EventParser.validateTransaction(parsed))
      .filter(parsed => parsed.executionTime > new Date())
      .map(parsed => ({
        ...parsed,
        formatted: EventParser.formatTransaction(parsed),
        timeUntilExecution: Math.floor(
          (parsed.executionTime.getTime() - Date.now()) / 1000
        )
      }));

    res.json({
      success: true,
      count: pending.length,
      transactions: pending
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending transactions'
    });
  }
});

export { router as transactionRouter };
```

## 🔌 Step 5: Integrate Transaction Routes

Update `backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { calendarRouter } from './routes/calendar.routes';
import { walletRouter } from './routes/wallet.routes';
import { streamsRouter } from './routes/streams.routes';
import { transactionRouter } from './routes/transaction.routes';

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
app.use('/api/transactions', transactionRouter);

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendar: '/api/calendar/*',
      wallet: '/api/wallet/*',
      streams: '/api/streams/*',
      transactions: '/api/transactions/*'
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
  logger.info(`💡 Endpoints: http://localhost:${PORT}/api/status`);
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

## 🧪 Step 6: Test Transaction Execution

### Test Event Parsing

```bash
curl -X POST http://localhost:3001/api/transactions/parse \
  -H "Content-Type: application/json" \
  -d '{
    "eventTitle": "Swap 0.1 ETH to USDC",
    "startTime": "2024-12-25T15:00:00Z",
    "eventId": "test-123"
  }'
```

Expected response:
```json
{
  "success": true,
  "parsed": {
    "valid": true,
    "type": "swap",
    "fromToken": "ETH",
    "toToken": "USDC",
    "amount": "0.1",
    "executionTime": "2024-12-25T15:00:00.000Z",
    "formatted": "Swap 0.1 ETH → USDC"
  }
}
```

### Create Test Calendar Event

```bash
curl -X POST http://localhost:3001/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Swap 0.01 ETH to USDC",
    "startTime": "2024-12-20T16:00:00Z",
    "endTime": "2024-12-20T16:30:00Z",
    "description": "Automated swap via Tempora"
  }'
```

### Execute the Transaction

```bash
curl -X POST http://localhost:3001/api/transactions/execute \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<your-event-id>",
    "calendarId": "primary"
  }'
```

## 🎉 What You've Built

Congratulations! You now have:

✅ Event parser for swap and transfer patterns
✅ Transaction validator
✅ Transaction executor with swap simulation
✅ Data Streams recording for all transactions
✅ Calendar event updates with results
✅ Complete transaction lifecycle management
✅ Error handling and status tracking

## 📁 New Files Created

```
backend/
├── src/
│   ├── services/
│   │   ├── calendar/
│   │   │   └── EventParser.ts ✅ (250+ lines)
│   │   └── blockchain/
│   │       └── TransactionExecutor.ts ✅ (350+ lines)
│   ├── routes/
│   │   └── transaction.routes.ts ✅ (200+ lines)
│   └── server.ts ✅ (updated)
```

## 📖 Next Steps

In the next chunk, you'll:
1. Create Calendar Agent with cron monitoring
2. Implement automatic transaction detection
3. Add scheduled execution
4. Set up agent lifecycle management
5. Test end-to-end automation

**Continue to:** [Chunk 6: Calendar Monitoring Agent →](06-calendar-agent.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

