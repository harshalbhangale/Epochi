import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { calendarRouter, calendarService } from './routes/calendar.routes';
import { walletRouter } from './routes/wallet.routes';
import { streamsRouter } from './routes/streams.routes';
import { transactionRouter } from './routes/transaction.routes';
import { agentRouter } from './routes/agent.routes';
import { dataStreamsRouter } from './routes/data-streams.routes';
import { validateEnvironment } from './utils/validateEnv';

// Load environment variables
dotenv.config();

// Validate environment in production
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnvironment();
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}

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
  defaultMeta: { service: 'epochi-backend' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
    service: 'Epochi Backend',
    version: '1.0.0',
    network: process.env.SOMNIA_NETWORK || 'testnet'
  });
});

// Calendar routes
app.use('/api/calendar', calendarRouter);

// Wallet routes
app.use('/api/wallet', walletRouter);

// Data Streams routes
app.use('/api/streams', streamsRouter);

// Transaction execution routes
app.use('/api/transactions', transactionRouter);

// Calendar Agent routes
app.use('/api/agent', agentRouter);

// Enhanced Data Streams routes
app.use('/api/data-streams', dataStreamsRouter);

// Convenience redirect for auth
app.get('/auth', (req: Request, res: Response) => {
  res.redirect('/api/calendar/auth');
});

// OAuth callback handler (matches GOOGLE_REDIRECT_URI in .env)
app.get('/auth/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Authorization code is required'
    });
  }

  try {
    await calendarService.getAccessToken(code);
    return res.json({
      success: true,
      message: 'Successfully authenticated with Google Calendar!',
      redirect: process.env.CALENDAR_POST_AUTH_REDIRECT ?? 'http://localhost:3000'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to authenticate with Google Calendar'
    });
  }
});

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Epochi API is running',
    endpoints: {
      health: '/health',
      calendarAuth: '/api/calendar/auth',
      calendarCallback: '/api/calendar/callback',
      calendarEvents: '/api/calendar/events',
      calendarStatus: '/api/calendar/status',
      walletInfo: '/api/wallet/:calendarId',
      walletAddress: '/api/wallet/:calendarId/address',
      walletSend: '/api/wallet/:calendarId/send',
      walletFaucet: '/api/wallet/:calendarId/faucet',
      networkStatus: '/api/wallet/network/status',
      streamsWrite: '/api/streams/transaction',
      streamsRead: '/api/streams/transaction/:transactionId',
      streamsAll: '/api/streams/transactions/:publisherAddress',
      streamsSchema: '/api/streams/schema',
      streamsPublisher: '/api/streams/publisher',
      transactionParse: '/api/transactions/parse',
      transactionExecute: '/api/transactions/execute',
      transactionPending: '/api/transactions/pending/:calendarId',
      agentStatus: '/api/agent/status',
      agentStart: '/api/agent/start',
      agentStop: '/api/agent/stop',
      agentQueue: '/api/agent/queue',
      agentClearCache: '/api/agent/clear-cache',
      // Enhanced Data Streams (Hackathon Use Cases)
      dataStreamsInfo: '/api/data-streams/info',
      dataStreamsIntent: '/api/data-streams/intent',
      dataStreamsStats: '/api/data-streams/stats/:userWallet',
      dataStreamsProof: '/api/data-streams/proof/:proofId',
      dataStreamsDemo: '/api/data-streams/demo'
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
  logger.info(`🚀 Epochi backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Network: ${process.env.SOMNIA_NETWORK || 'testnet'}`);
  logger.info(`📅 Calendar polling interval: ${process.env.CALENDAR_POLL_INTERVAL || 30}s`);
  logger.info(`💡 Health Check: http://localhost:${PORT}/health`);
  logger.info(`📅 Calendar auth: http://localhost:${PORT}/api/calendar/auth`);
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

