# 🚀 Chunk 8: Testing & Deployment

Welcome to the final chunk! In this guide, you'll learn how to test your complete Tempora application end-to-end and deploy it to production.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Complete end-to-end testing procedures
- Production deployment configuration
- Environment variables setup
- Security best practices implemented
- Monitoring and logging configured
- Production-ready Tempora application

## 📋 Prerequisites

- Completed all previous chunks (1-7)
- Backend and frontend running locally
- Google Calendar authenticated
- Testnet wallet funded

## 🧪 Step 1: End-to-End Testing

### Test 1: Calendar Authentication

```bash
# Check if calendar is authenticated
curl http://localhost:3001/api/calendar/status
```

**Expected Response:**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authenticated with Google Calendar"
}
```

**If not authenticated:**
1. Visit: http://localhost:3001/api/calendar/auth
2. Sign in with Google
3. Grant permissions
4. Verify authentication

### Test 2: Wallet Generation

```bash
# Get wallet info for primary calendar
curl http://localhost:3001/api/wallet/primary
```

**Expected Response:**
```json
{
  "success": true,
  "wallet": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEe8",
    "balance": "1000000000000000000",
    "balanceFormatted": "1.0",
    "network": "Somnia Testnet",
    "explorerUrl": "https://somnia.explorer.caldera.xyz/address/0x...",
    "chainId": 50311
  }
}
```

**Fund your wallet:**
1. Copy the wallet address
2. Visit: https://faucet.somnia.network
3. Paste address and request tokens
4. Wait 30 seconds
5. Check balance again

### Test 3: Data Streams Schema

```bash
# Get schema information
curl http://localhost:3001/api/streams/schema
```

**Expected Response:**
```json
{
  "success": true,
  "schemaId": "0x1234abcd...",
  "schema": {
    "fields": [
      "timestamp (uint64)",
      "transactionId (bytes32)",
      ...
    ]
  }
}
```

### Test 4: Agent Status

```bash
# Check agent is running
curl http://localhost:3001/api/agent/status
```

**Expected Response:**
```json
{
  "success": true,
  "agent": {
    "isRunning": true,
    "lastCheckTime": "2024-12-20T10:30:15.000Z",
    "totalChecks": 42,
    "transactionsDetected": 0,
    "transactionsExecuted": 0,
    "transactionsFailed": 0,
    "queueSize": 0
  }
}
```

### Test 5: Create and Execute Transaction

**Step 1: Create calendar event**

```bash
# Calculate time 2 minutes from now
FUTURE_TIME=$(date -u -v+2M +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+2 minutes" +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST http://localhost:3001/api/calendar/events \
  -H "Content-Type: application/json" \
  -d "{
    \"summary\": \"Swap 0.001 ETH to USDC\",
    \"startTime\": \"$FUTURE_TIME\",
    \"endTime\": \"$FUTURE_TIME\",
    \"description\": \"E2E test transaction\"
  }"
```

**Step 2: Verify agent detects it**

```bash
# Check pending transactions
curl http://localhost:3001/api/transactions/pending/primary
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "transactions": [
    {
      "valid": true,
      "type": "swap",
      "fromToken": "ETH",
      "toToken": "USDC",
      "amount": "0.001",
      "timeUntilExecution": 115
    }
  ]
}
```

**Step 3: Wait for execution**

Monitor backend logs:
```bash
# You should see:
# 🎯 Detected transaction: Swap 0.001 ETH → USDC
# ➕ Added to queue: Swap 0.001 ETH to USDC
# ⏳ Waiting for Swap 0.001 ETH to USDC (115s)
# 🚀 Executing transaction: Swap 0.001 ETH to USDC
# ✅ Transaction executed successfully!
```

**Step 4: Verify calendar update**

Visit Google Calendar and check your event. It should now have:
```
✅ Transaction Executed!
━━━━━━━━━━━━━━━━━━━━
🔗 Transaction: https://somnia.explorer.caldera.xyz/tx/0x...
💰 Received: 2.5 USDC
📊 Data Stream: 0xdef789...
⏰ Executed: 2024-12-20T10:32:00.000Z
```

**Step 5: Verify Data Streams record**

```bash
# Get your service address from logs, then:
curl "http://localhost:3001/api/streams/transactions/0xYOUR_SERVICE_ADDRESS"
```

You should see your transaction recorded!

## 📦 Step 2: Production Environment Setup

### Backend Environment Variables

Create `backend/.env.production`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Google Calendar API (Production)
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
CALENDAR_ID=primary

# Somnia Network (Mainnet - when available)
SOMNIA_RPC_URL=https://rpc.somnia.network
SOMNIA_CHAIN_ID=50300
SOMNIA_EXPLORER_URL=https://explorer.somnia.network
SOMNIA_NETWORK=mainnet

# Somnia Data Streams
STREAMS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Security (IMPORTANT: Use strong keys in production!)
ENCRYPTION_KEY=your_very_secure_32_byte_encryption_key_here_change_this

# Monitoring
CALENDAR_POLL_INTERVAL=30
LOG_LEVEL=info

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Frontend Environment Variables

Create `frontend/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🔒 Step 3: Security Best Practices

### 1. Secure Your Encryption Key

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this in production `.env`

### 2. Update CORS Configuration

Update `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. Add Rate Limiting

Install rate limiting:

```bash
cd tempora/backend
npm install express-rate-limit
```

Update `backend/src/server.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

### 4. Add Helmet for Security Headers

```bash
cd tempora/backend
npm install helmet
```

Update `backend/src/server.ts`:

```typescript
import helmet from 'helmet';

app.use(helmet());
```

### 5. Environment Validation

Create `backend/src/utils/validateEnv.ts`:

```typescript
export function validateEnvironment() {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'ENCRYPTION_KEY',
    'SOMNIA_RPC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }

  console.log('✅ Environment variables validated');
}
```

Update `backend/src/server.ts`:

```typescript
import { validateEnvironment } from './utils/validateEnv';

// Validate environment on startup
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}
```

## 📊 Step 4: Monitoring and Logging

### Winston Logger Configuration

Update `backend/src/server.ts` logger:

```typescript
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { 
    service: 'tempora-backend',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Error logs
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Console output (production: JSON, development: pretty)
    new transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? format.json()
        : format.combine(format.colorize(), format.simple())
    })
  ]
});
```

### Health Check Enhancement

Update health check endpoint:

```typescript
app.get('/health', async (req: Request, res: Response) => {
  const agentStatus = calendarAgent.getStatus();
  
  // Check calendar auth
  const calendarAuth = calendarService.isAuth();
  
  // Check network connection
  let networkOk = false;
  try {
    await walletService.getBlockNumber();
    networkOk = true;
  } catch (err) {
    networkOk = false;
  }
  
  const health = {
    status: networkOk && calendarAuth ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'Tempora Backend',
    version: '1.0.0',
    network: process.env.SOMNIA_NETWORK || 'testnet',
    checks: {
      calendar: calendarAuth ? 'ok' : 'failed',
      blockchain: networkOk ? 'ok' : 'failed',
      agent: agentStatus.isRunning ? 'running' : 'stopped'
    },
    agent: {
      running: agentStatus.isRunning,
      queueSize: agentStatus.queueSize,
      executed: agentStatus.transactionsExecuted
    }
  };
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## 🚀 Step 5: Deployment Guide

### Option 1: Deploy to Railway

1. **Prepare your repository**

```bash
# Ensure .gitignore includes
echo ".env
.env.local
.env.production
tokens.json
logs/
node_modules/" >> .gitignore

git add .
git commit -m "Prepare for deployment"
git push
```

2. **Deploy Backend**

- Go to [Railway.app](https://railway.app)
- Click "New Project" → "Deploy from GitHub"
- Select your repository
- Set root directory: `backend`
- Add environment variables from `.env.production`
- Deploy

3. **Deploy Frontend**

- Create new Railway project
- Set root directory: `frontend`
- Add `NEXT_PUBLIC_API_URL` with your backend URL
- Deploy

### Option 2: Deploy to Vercel (Frontend) + Railway (Backend)

**Backend (Railway):**
- Follow Railway steps above

**Frontend (Vercel):**

```bash
cd tempora/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
```

### Option 3: Self-Hosted (VPS)

**Prerequisites:**
- Ubuntu 22.04 server
- Node.js 20+ installed
- Nginx installed
- Domain name configured

**Backend Setup:**

```bash
# SSH into server
ssh user@your-server.com

# Clone repository
git clone https://github.com/yourusername/tempora.git
cd tempora/backend

# Install dependencies
npm install

# Create production env
nano .env.production
# (paste your production env vars)

# Build
npm run build

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start dist/server.js --name tempora-backend

# Save PM2 config
pm2 save
pm2 startup
```

**Frontend Setup:**

```bash
cd ../frontend

# Install dependencies
npm install

# Create production env
nano .env.production
# Add: NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Build
npm run build

# Start with PM2
pm2 start npm --name tempora-frontend -- start

pm2 save
```

**Nginx Configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

## 📝 Step 6: Production Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] Encryption key is strong and unique
- [ ] Google OAuth callback URLs updated for production
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] CORS configured for production domain
- [ ] Logs directory created and writable
- [ ] Database/token storage configured
- [ ] Error tracking set up (e.g., Sentry)

### After Deployment

- [ ] Health check endpoint returns 200
- [ ] Google Calendar authentication works
- [ ] Wallet generation works
- [ ] Data Streams writes succeed
- [ ] Agent starts and runs
- [ ] Frontend loads and displays data
- [ ] End-to-end transaction test passes
- [ ] SSL certificate valid
- [ ] Monitoring dashboards configured

## 🐛 Step 7: Troubleshooting Production Issues

### Issue: Agent not starting in production

**Solution:**
```bash
# Check logs
pm2 logs tempora-backend

# Verify calendar authentication
curl https://api.yourdomain.com/api/calendar/status

# Restart agent
curl -X POST https://api.yourdomain.com/api/agent/start
```

### Issue: CORS errors

**Solution:**
Update `CORS_ORIGIN` in backend `.env.production`:
```bash
CORS_ORIGIN=https://yourdomain.com
```

Restart backend:
```bash
pm2 restart tempora-backend
```

### Issue: Data Streams writes failing

**Solution:**
1. Check RPC URL is correct
2. Verify wallet has gas
3. Check Data Streams contract address
4. Review error logs

### Issue: High memory usage

**Solution:**
```bash
# Check memory
pm2 monit

# Increase Node.js memory limit
pm2 delete tempora-backend
pm2 start dist/server.js --name tempora-backend --node-args="--max-old-space-size=2048"
pm2 save
```

## 🎉 Congratulations!

You've successfully built and deployed **Tempora** - a production-ready calendar-based DeFi automation platform on Somnia Network!

### What You've Accomplished

✅ **Chunks 1-8 Complete:**
1. ✅ Project setup with TypeScript, Express, Next.js
2. ✅ Google Calendar OAuth 2.0 integration
3. ✅ Somnia wallet service with Viem
4. ✅ Data Streams integration for immutable records
5. ✅ Transaction execution system with swap logic
6. ✅ Automated calendar monitoring agent
7. ✅ Beautiful Next.js dashboard
8. ✅ Production deployment and testing

### Your Application Features

- 🔐 **Deterministic Wallets**: No MetaMask required
- 📅 **Calendar Integration**: Schedule transactions via Google Calendar
- ⚡ **Somnia Network**: Ultra-fast, low-cost transactions
- 📊 **Data Streams**: Immutable on-chain transaction records
- 🤖 **Automated Agent**: Monitors and executes transactions
- 🎨 **Modern UI**: Beautiful dashboard with real-time updates
- 🔒 **Secure**: Production-ready security practices

### Next Steps

1. **Test thoroughly** with testnet tokens
2. **Get user feedback** from beta testers
3. **Add features**:
   - Token price feeds
   - Multiple DEX support
   - Transaction scheduling strategies
   - Email notifications
   - Mobile app
4. **Apply for grants** from Somnia Foundation
5. **Launch mainnet** version when Somnia mainnet is live

### Resources

- **Somnia Docs**: https://docs.somnia.network
- **Somnia Discord**: https://discord.gg/somnia
- **Somnia Explorer**: https://somnia.explorer.caldera.xyz
- **Somnia Faucet**: https://faucet.somnia.network

### Share Your Project

- Tweet about your build: `#SomniaNetwork #DeFi #Web3`
- Submit to Somnia showcase
- Write a blog post
- Create a demo video

## 📚 Complete Documentation Index

1. [Project Setup](01-project-setup.md) - Initialize project and dependencies
2. [Google Calendar Integration](02-google-calendar-setup.md) - OAuth and Calendar API
3. [Somnia Wallet Service](03-somnia-wallet-service.md) - Viem wallet management
4. [Data Streams Setup](04-data-streams-setup.md) - On-chain data records
5. [Transaction Execution](05-transaction-execution.md) - Swap logic and executor
6. [Calendar Agent](06-calendar-agent.md) - Automated monitoring
7. [Frontend Dashboard](07-frontend-dashboard.md) - Next.js UI
8. [Testing & Deployment](08-testing-deployment.md) - You are here!

---

**Thank you for building with Tempora and Somnia Network! 🚀**

If you have questions or need help, open an issue on GitHub or reach out on Discord.

Happy building! 🎉

