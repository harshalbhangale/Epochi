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
export interface QueuedTransaction {
  parsed: ParsedTransaction;
  calendarId: string;
  addedAt: Date;
  attempts: number;
}

/**
 * Agent statistics
 */
export interface AgentStats {
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
  private readonly CHECK_INTERVAL = parseInt(process.env.CALENDAR_POLL_INTERVAL || '30', 10); // seconds
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
    this.checkCalendar().catch((error) => {
      console.error('Error in initial calendar check:', error);
    });
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
          ).catch((err) => {
            console.error('Failed to update calendar event:', err);
          });

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
            ).catch((err) => {
              console.error('Failed to update calendar event:', err);
            });

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

