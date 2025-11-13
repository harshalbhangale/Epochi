import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import { calendarService } from './calendar.routes';
import { walletService } from './wallet.routes';
import { dataStreamsService } from './streams.routes';
import EventParser from '../services/calendar/EventParser';
import TransactionExecutor from '../services/blockchain/TransactionExecutor';

// Load environment variables
dotenv.config();

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

    return res.json({
      success: true,
      parsed: {
        ...parsed,
        valid: isValid,
        formatted: EventParser.formatTransaction(parsed)
      }
    });
  } catch (error: any) {
    return res.status(500).json({
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

    // Check calendar authentication
    if (!calendarService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google Calendar'
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
      ).catch((err) => {
        console.error('Failed to update calendar event:', err);
      });

      return res.json({
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
      ).catch((err) => {
        console.error('Failed to update calendar event:', err);
      });

      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    return res.status(500).json({
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

    // Check calendar authentication
    if (!calendarService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google Calendar'
      });
    }

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

    return res.json({
      success: true,
      count: pending.length,
      transactions: pending
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending transactions'
    });
  }
});

export { router as transactionRouter };

