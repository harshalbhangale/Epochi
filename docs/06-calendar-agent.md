# 🤖 Chunk 6: Calendar Monitoring Agent

In this chunk, you'll create the automated Calendar Agent that continuously monitors Google Calendar, detects transaction events, and executes them at the scheduled time.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Automated calendar monitoring with node-cron
- Transaction queue management
- Scheduled execution system
- Complete CalendarAgent implementation
- Agent lifecycle management
- Full end-to-end automation

## 📋 Prerequisites

- Completed [Chunk 1: Project Setup](01-project-setup.md)
- Completed [Chunk 2: Google Calendar Integration](02-google-calendar-setup.md)
- Completed [Chunk 3: Somnia Wallet Service](03-somnia-wallet-service.md)
- Completed [Chunk 4: Data Streams Integration](04-data-streams-setup.md)
- Completed [Chunk 5: Transaction Execution](05-transaction-execution.md)

## 🔄 Step 1: Understanding the Agent Flow

### Agent Lifecycle

```
┌─────────────────────────────────────────┐
│         CALENDAR AGENT STARTS            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  CRON JOB: Every 30 seconds             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Fetch upcoming calendar events         │
│  (next 24 hours)                        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Parse each event for transactions      │
│  Filter: valid && not processed         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  For each transaction:                  │
│  • Check if execution time arrived      │
│  • Execute if ready                     │
│  • Update calendar event                │
│  • Record to Data Streams               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Wait 30 seconds, repeat                │
└─────────────────────────────────────────┘
```

## 📦 Step 2: Install Dependencies

```bash
cd tempora/backend
npm install node-cron
npm install --save-dev @types/node-cron
```

## 📝 Step 3: Create Calendar Agent

Create `backend/src/services/monitoring/CalendarAgent.ts`:

```typescript
import cron from 'node-cron';
import { calendar_v3 } from 'googleapis';
import CalendarService from '../calendar/CalendarService';
import EventParser, { ParsedTransaction } from '../calendar/EventParser';
import TransactionExecutor from '../blockchain/TransactionExecutor';
import SomniaWalletService from '../blockchain/SomniaWalletService';
import DataStreamsService from '../blockchain/DataStreamsService';

/**
 * Transaction queue item
 */
interface QueuedTransaction {
  parsed: ParsedTransaction;
  calendarId: string;
  addedAt: Date;
  attempts: number;
}

/**
 * Agent statistics
 */
interface AgentStats {
  isRunning: boolean;
  lastCheckTime: Date | null;
  totalChecks: number;
  transactionsDetected: number;
  transactionsExecuted: number;
  transactionsFailed: number;
  queueSize: number;
}

/**
 * CalendarAgent monitors Google Calendar and executes transactions
 */
export class CalendarAgent {
  private calendarService: CalendarService;
  private transactionExecutor: TransactionExecutor;
  private walletService: SomniaWalletService;
  private dataStreamsService: DataStreamsService;

  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private transactionQueue: Map<string, QueuedTransaction> = new Map();
  private processedEvents: Set<string> = new Set();

  // Statistics
  private stats: AgentStats = {
    isRunning: false,
    lastCheckTime: null,
    totalChecks: 0,
    transactionsDetected: 0,
    transactionsExecuted: 0,
    transactionsFailed: 0,
    queueSize: 0,
  };

  // Configuration
  private readonly CHECK_INTERVAL = process.env.CALENDAR_POLL_INTERVAL || '30'; // seconds
  private readonly CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    calendarService: CalendarService,
    walletService: SomniaWalletService,
    dataStreamsService: DataStreamsService
  ) {
    this.calendarService = calendarService;
    this.walletService = walletService;
    this.dataStreamsService = dataStreamsService;
    this.transactionExecutor = new TransactionExecutor(
      walletService,
      dataStreamsService
    );

    console.log('🤖 Calendar Agent initialized');
  }

  /**
   * Start the calendar monitoring agent
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Calendar Agent is already running');
      return;
    }

    // Check if calendar is authenticated
    if (!this.calendarService.isAuth()) {
      console.log('❌ Calendar not authenticated. Please authenticate first.');
      console.log('🔗 Visit: http://localhost:3001/api/calendar/auth');
      return;
    }

    console.log(`🚀 Starting Calendar Agent...`);
    console.log(`📅 Calendar ID: ${this.CALENDAR_ID}`);
    console.log(`⏱️ Check interval: Every ${this.CHECK_INTERVAL} seconds`);

    // Create cron job (every N seconds)
    const cronExpression = `*/${this.CHECK_INTERVAL} * * * * *`;
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.checkCalendar();
    });

    this.isRunning = true;
    this.stats.isRunning = true;

    console.log('✅ Calendar Agent started successfully');
    console.log(`🔍 Monitoring for transaction events...`);

    // Run initial check immediately
    this.checkCalendar();
  }

  /**
   * Stop the calendar monitoring agent
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Calendar Agent is not running');
      return;
    }

    console.log('🛑 Stopping Calendar Agent...');

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    this.stats.isRunning = false;

    console.log('✅ Calendar Agent stopped');
  }

  /**
   * Check calendar for new transaction events
   */
  private async checkCalendar(): Promise<void> {
    try {
      this.stats.lastCheckTime = new Date();
      this.stats.totalChecks++;

      console.log(`🔍 Checking calendar... (Check #${this.stats.totalChecks})`);

      // Get upcoming events (next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await this.calendarService.getEventsBetween(now, tomorrow);

      if (events.length === 0) {
        console.log('📭 No upcoming events found');
        return;
      }

      console.log(`📬 Found ${events.length} upcoming events`);

      // Process each event
      for (const event of events) {
        await this.processEvent(event);
      }

      // Execute ready transactions
      await this.executeReadyTransactions();

      // Update stats
      this.stats.queueSize = this.transactionQueue.size;

      console.log(`✅ Check complete. Queue size: ${this.transactionQueue.size}`);
    } catch (error) {
      console.error('❌ Error checking calendar:', error);
    }
  }

  /**
   * Process a single calendar event
   */
  private async processEvent(event: calendar_v3.Schema$Event): Promise<void> {
    const eventId = event.id || '';
    const eventTitle = event.summary || '';

    // Skip if already processed
    if (this.processedEvents.has(eventId)) {
      return;
    }

    // Skip if already executed (check description for checkmark)
    if (event.description?.includes('✅ Transaction Executed')) {
      this.processedEvents.add(eventId);
      return;
    }

    // Parse the event
    const parsed = EventParser.parseEvent(event);

    // Skip if not a valid transaction
    if (!EventParser.validateTransaction(parsed)) {
      return;
    }

    console.log(`🎯 Detected transaction: ${EventParser.formatTransaction(parsed)}`);
    
    // Add to queue if not already there
    if (!this.transactionQueue.has(eventId)) {
      this.transactionQueue.set(eventId, {
        parsed,
        calendarId: this.CALENDAR_ID,
        addedAt: new Date(),
        attempts: 0,
      });

      this.stats.transactionsDetected++;
      console.log(`➕ Added to queue: ${eventTitle}`);
    }
  }

  /**
   * Execute transactions that are ready
   */
  private async executeReadyTransactions(): Promise<void> {
    const now = new Date();

    for (const [eventId, queued] of this.transactionQueue.entries()) {
      const { parsed, calendarId, attempts } = queued;

      // Check if execution time has arrived
      if (parsed.executionTime > now) {
        const timeUntil = Math.floor((parsed.executionTime.getTime() - now.getTime()) / 1000);
        if (timeUntil % 60 === 0) { // Log every minute
          console.log(`⏳ Waiting for ${parsed.eventTitle} (${timeUntil}s)`);
        }
        continue;
      }

      // Check if max retries exceeded
      if (attempts >= this.MAX_RETRY_ATTEMPTS) {
        console.log(`❌ Max retries exceeded for ${parsed.eventTitle}`);
        this.transactionQueue.delete(eventId);
        this.processedEvents.add(eventId);
        this.stats.transactionsFailed++;
        continue;
      }

      console.log(`🚀 Executing transaction: ${parsed.eventTitle}`);

      try {
        // Execute the transaction
        const result = await this.transactionExecutor.executeTransaction(
          parsed,
          calendarId
        );

        if (result.success) {
          console.log(`✅ Transaction executed successfully!`);
          console.log(`🔗 Explorer: ${result.explorerUrl}`);

          // Update calendar event
          await this.calendarService.appendToDescription(
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

          // Remove from queue and mark as processed
          this.transactionQueue.delete(eventId);
          this.processedEvents.add(eventId);
          this.stats.transactionsExecuted++;
        } else {
          console.log(`❌ Transaction failed: ${result.error}`);

          // Increment attempts
          queued.attempts++;
          this.transactionQueue.set(eventId, queued);

          // If max retries reached, update calendar with failure
          if (queued.attempts >= this.MAX_RETRY_ATTEMPTS) {
            await this.calendarService.appendToDescription(
              eventId,
              `
❌ Transaction Failed (Max retries exceeded)
━━━━━━━━━━━━━━━━━━━━
Error: ${result.error}
Attempts: ${queued.attempts}
⏰ Last attempt: ${new Date().toISOString()}
              `.trim()
            );

            this.transactionQueue.delete(eventId);
            this.processedEvents.add(eventId);
            this.stats.transactionsFailed++;
          }
        }
      } catch (error: any) {
        console.error(`❌ Error executing transaction:`, error);
        
        // Increment attempts
        queued.attempts++;
        this.transactionQueue.set(eventId, queued);
      }
    }
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStats {
    return {
      ...this.stats,
      queueSize: this.transactionQueue.size,
    };
  }

  /**
   * Get queued transactions
   */
  getQueue(): QueuedTransaction[] {
    return Array.from(this.transactionQueue.values());
  }

  /**
   * Clear processed events cache
   */
  clearProcessedCache(): void {
    this.processedEvents.clear();
    console.log('🗑️ Processed events cache cleared');
  }
}

export default CalendarAgent;
```

## 🛣️ Step 4: Create Agent Routes

Create `backend/src/routes/agent.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { calendarAgent } from '../index';

const router = Router();

/**
 * GET /api/agent/status
 * Get agent status and statistics
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = calendarAgent.getStatus();

    res.json({
      success: true,
      agent: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent status'
    });
  }
});

/**
 * POST /api/agent/start
 * Start the calendar monitoring agent
 */
router.post('/start', (req: Request, res: Response) => {
  try {
    calendarAgent.start();

    res.json({
      success: true,
      message: 'Calendar Agent started successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start agent'
    });
  }
});

/**
 * POST /api/agent/stop
 * Stop the calendar monitoring agent
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    calendarAgent.stop();

    res.json({
      success: true,
      message: 'Calendar Agent stopped successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop agent'
    });
  }
});

/**
 * GET /api/agent/queue
 * Get queued transactions
 */
router.get('/queue', (req: Request, res: Response) => {
  try {
    const queue = calendarAgent.getQueue();

    res.json({
      success: true,
      count: queue.length,
      queue: queue.map(item => ({
        eventTitle: item.parsed.eventTitle,
        type: item.parsed.type,
        formatted: `${item.parsed.amount} ${item.parsed.fromToken} → ${item.parsed.toToken}`,
        executionTime: item.parsed.executionTime,
        timeUntilExecution: Math.floor(
          (item.parsed.executionTime.getTime() - Date.now()) / 1000
        ),
        attempts: item.attempts
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get queue'
    });
  }
});

/**
 * POST /api/agent/clear-cache
 * Clear processed events cache
 */
router.post('/clear-cache', (req: Request, res: Response) => {
  try {
    calendarAgent.clearProcessedCache();

    res.json({
      success: true,
      message: 'Processed events cache cleared'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

export { router as agentRouter };
```

## 🔧 Step 5: Create Agent Index & Update Server

Create `backend/src/index.ts`:

```typescript
import CalendarService from './services/calendar/CalendarService';
import SomniaWalletService from './services/blockchain/SomniaWalletService';
import DataStreamsService from './services/blockchain/DataStreamsService';
import CalendarAgent from './services/monitoring/CalendarAgent';
import crypto from 'crypto';

// Generate service key
const generateServiceKey = (): `0x${string}` => {
  const secret = process.env.ENCRYPTION_KEY || 'tempora-service-key';
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return `0x${hash}` as `0x${string}`;
};

// Initialize services
const calendarService = new CalendarService();
const walletService = new SomniaWalletService();
const dataStreamsService = new DataStreamsService(generateServiceKey());

// Initialize Data Streams
dataStreamsService.initialize().catch(console.error);

// Create calendar agent
const calendarAgent = new CalendarAgent(
  calendarService,
  walletService,
  dataStreamsService
);

export {
  calendarService,
  walletService,
  dataStreamsService,
  calendarAgent
};
```

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
import { agentRouter } from './routes/agent.routes';
import { calendarAgent } from './index';

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
  const agentStatus = calendarAgent.getStatus();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Tempora Backend',
    version: '1.0.0',
    network: 'Somnia Testnet',
    agent: {
      running: agentStatus.isRunning,
      queueSize: agentStatus.queueSize
    }
  });
});

// API routes
app.use('/api/calendar', calendarRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/streams', streamsRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/agent', agentRouter);

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendar: '/api/calendar/*',
      wallet: '/api/wallet/*',
      streams: '/api/streams/*',
      transactions: '/api/transactions/*',
      agent: '/api/agent/*'
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
  
  // Auto-start agent after 5 seconds (if calendar is authenticated)
  setTimeout(() => {
    try {
      calendarAgent.start();
    } catch (error) {
      logger.warn('Could not auto-start agent. Authenticate first.');
    }
  }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  calendarAgent.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  calendarAgent.stop();
  process.exit(0);
});

export default app;
```

## 🧪 Step 6: Test Calendar Agent

### Start the Backend

```bash
cd tempora/backend
npm run dev
```

### Check Agent Status

```bash
curl http://localhost:3001/api/agent/status
```

Expected response:
```json
{
  "success": true,
  "agent": {
    "isRunning": true,
    "lastCheckTime": "2024-12-20T10:30:15.000Z",
    "totalChecks": 42,
    "transactionsDetected": 3,
    "transactionsExecuted": 1,
    "transactionsFailed": 0,
    "queueSize": 2
  }
}
```

### View Queue

```bash
curl http://localhost:3001/api/agent/queue
```

### Create Test Event

```bash
# Create event for 2 minutes from now
FUTURE_TIME=$(date -u -v+2M +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST http://localhost:3001/api/calendar/events \
  -H "Content-Type: application/json" \
  -d "{
    \"summary\": \"Swap 0.001 ETH to USDC\",
    \"startTime\": \"$FUTURE_TIME\",
    \"endTime\": \"$FUTURE_TIME\",
    \"description\": \"Test automated swap\"
  }"
```

### Watch the Agent Execute

Monitor the backend logs. You should see:
1. Agent detects the event
2. Adds to queue
3. Waits for execution time
4. Executes the swap
5. Updates calendar event

## 🎉 What You've Built

Congratulations! You now have:

✅ Automated calendar monitoring with node-cron
✅ Transaction queue management
✅ Scheduled execution system
✅ Complete CalendarAgent implementation
✅ Agent lifecycle management (start/stop)
✅ Retry logic for failed transactions
✅ Full end-to-end automation
✅ Agent statistics and monitoring

## 📁 New Files Created

```
backend/
├── src/
│   ├── services/
│   │   └── monitoring/
│   │       └── CalendarAgent.ts ✅ (500+ lines)
│   ├── routes/
│   │   └── agent.routes.ts ✅ (150+ lines)
│   ├── index.ts ✅ (50+ lines)
│   └── server.ts ✅ (updated)
```

## 🔍 Agent Behavior Explained

### Check Frequency
- **Default**: Every 30 seconds
- **Configurable**: `CALENDAR_POLL_INTERVAL` env variable
- **Why**: Balance between responsiveness and API quota

### Transaction Queue
- Stores detected transactions until execution time
- Prevents duplicate processing
- Tracks retry attempts

### Processed Events Cache
- Remembers already-executed events
- Prevents re-execution
- Clears on restart (intentional for testing)

## 🐛 Common Issues & Solutions

### Issue: Agent not starting
**Solution:**
```bash
# Ensure calendar is authenticated first
curl http://localhost:3001/api/calendar/status

# If not authenticated, visit:
http://localhost:3001/api/calendar/auth
```

### Issue: Events not being detected
**Solution:**
```bash
# Check agent status
curl http://localhost:3001/api/agent/status

# Clear processed cache
curl -X POST http://localhost:3001/api/agent/clear-cache

# Restart agent
curl -X POST http://localhost:3001/api/agent/stop
curl -X POST http://localhost:3001/api/agent/start
```

### Issue: Transaction stuck in queue
**Solution:**
Check execution time is in the future:
```bash
curl http://localhost:3001/api/agent/queue
```

## 📖 Next Steps

In the next chunk, you'll:
1. Create Next.js frontend dashboard
2. Display wallet and balance
3. Show pending transactions
4. Display transaction history from Data Streams
5. Add real-time updates

**Continue to:** [Chunk 7: Frontend Dashboard →](07-frontend-dashboard.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

