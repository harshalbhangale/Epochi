import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import { calendarService } from './calendar.routes';
import { walletService } from './wallet.routes';
import { dataStreamsService } from './streams.routes';
import CalendarAgent from '../services/monitoring/CalendarAgent';

// Load environment variables
dotenv.config();

const router = Router();

// Initialize calendar agent
const calendarAgent = new CalendarAgent(
  calendarService,
  walletService,
  dataStreamsService
);

/**
 * GET /api/agent/status
 * Get agent status and statistics
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = calendarAgent.getStatus();

    return res.json({
      success: true,
      agent: status
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent status'
    });
  }
});

/**
 * POST /api/agent/start
 * Start the calendar monitoring agent
 */
router.post('/start', (_req: Request, res: Response) => {
  try {
    calendarAgent.start();

    return res.json({
      success: true,
      message: 'Calendar Agent started successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start agent'
    });
  }
});

/**
 * POST /api/agent/stop
 * Stop the calendar monitoring agent
 */
router.post('/stop', (_req: Request, res: Response) => {
  try {
    calendarAgent.stop();

    return res.json({
      success: true,
      message: 'Calendar Agent stopped successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop agent'
    });
  }
});

/**
 * GET /api/agent/queue
 * Get queued transactions
 */
router.get('/queue', (_req: Request, res: Response) => {
  try {
    const queue = calendarAgent.getQueue();

    return res.json({
      success: true,
      count: queue.length,
      queue: queue.map(item => ({
        eventTitle: item.parsed.eventTitle,
        type: item.parsed.type,
        formatted: `${item.parsed.amount} ${item.parsed.fromToken} → ${item.parsed.toToken}`,
        executionTime: item.parsed.executionTime.toISOString(),
        timeUntilExecution: Math.floor(
          (item.parsed.executionTime.getTime() - Date.now()) / 1000
        ),
        attempts: item.attempts,
        addedAt: item.addedAt.toISOString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get queue'
    });
  }
});

/**
 * POST /api/agent/clear-cache
 * Clear processed events cache
 */
router.post('/clear-cache', (_req: Request, res: Response) => {
  try {
    calendarAgent.clearProcessedCache();

    return res.json({
      success: true,
      message: 'Processed events cache cleared'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

export { router as agentRouter, calendarAgent };

