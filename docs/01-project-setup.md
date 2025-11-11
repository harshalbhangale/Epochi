# 📦 Chunk 1: Project Setup & Architecture

Welcome to **Epochi** - a revolutionary platform that transforms Google Calendar into a powerful DeFi automation tool on Somnia Network. In this guide, you'll set up the complete project from scratch.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- A complete project structure ready for development
- All dependencies installed and configured
- Development environment set up
- Understanding of the system architecture

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 20+** installed ([Download here](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** for version control
- A code editor (**VSCode** recommended)
- Basic knowledge of TypeScript and React
- A Google account (for Calendar API later)

## 🏗️ System Architecture Overview

Tempora consists of three main components:

```
┌─────────────────────────────────────────────────────────┐
│                    TEMPORA ARCHITECTURE                  │
└─────────────────────────────────────────────────────────┘

1️⃣ BACKEND (Node.js + Express)
   ├── Calendar Service → Monitors Google Calendar
   ├── Wallet Service → Manages blockchain wallets
   ├── Data Streams Service → Writes to Somnia
   ├── Transaction Executor → Executes swaps
   └── Calendar Agent → Automated monitoring

2️⃣ BLOCKCHAIN (Somnia Network)
   ├── Deterministic Wallets → Generated from calendar ID
   ├── Data Streams → Immutable transaction records
   ├── DEX Integration → Token swaps
   └── Sub-second finality → Fast confirmations

3️⃣ FRONTEND (Next.js)
   ├── Dashboard → View transactions
   ├── Calendar View → See scheduled events
   ├── Portfolio → Track balances
   └── Real-time Updates → WebSocket notifications
```

### How It Works

1. **User creates calendar event**: "Swap 1 ETH to USDC at 2PM tomorrow"
2. **Calendar Agent detects event**: Runs every 30 seconds
3. **Parses transaction intent**: Extracts amount, tokens, time
4. **Waits for execution time**: Monitors until 2PM
5. **Executes on blockchain**: Signs and submits transaction
6. **Records to Data Streams**: Writes immutable proof
7. **Updates calendar event**: Adds transaction hash and link
8. **Dashboard shows result**: Real-time update via WebSocket

## 🚀 Step 1: Create Project Structure

Let's create a brand new project directory structure:

```bash
# Navigate to your workspace
cd ~/Desktop/somania

# Create main project directory
mkdir tempora
cd tempora

# Initialize git repository
git init

# Create project structure
mkdir -p {backend,frontend,docs}
mkdir -p backend/{src,public}
mkdir -p backend/src/{services,routes,schemas,utils}
mkdir -p backend/src/services/{calendar,blockchain,monitoring}
mkdir -p frontend/{app,components,lib,hooks}

# Create config files
touch backend/.env.example
touch backend/.gitignore
touch backend/tsconfig.json
touch backend/package.json
touch frontend/.gitignore
touch frontend/tsconfig.json
touch frontend/package.json
touch README.md
```

Your structure should now look like:

```
tempora/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── calendar/
│   │   │   ├── blockchain/
│   │   │   └── monitoring/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── utils/
│   ├── public/
│   ├── .env.example
│   ├── .gitignore
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── .gitignore
│   ├── tsconfig.json
│   └── package.json
├── docs/
└── README.md
```

## 📦 Step 2: Initialize Backend

### Create Backend package.json

```bash
cd backend
```

Create `backend/package.json`:

```json
{
  "name": "tempora-backend",
  "version": "1.0.0",
  "description": "Tempora backend - Calendar-based DeFi automation on Somnia",
  "main": "src/server.ts",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": ["defi", "calendar", "somnia", "automation"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@somnia-chain/streams": "^1.0.0",
    "viem": "^2.7.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "googleapis": "^126.0.0",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.20",
    "@types/cors": "^2.8.15",
    "@types/node": "^20.10.0",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "prettier": "^3.1.1"
  }
}
```

### Create Backend TypeScript Config

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Create Backend .gitignore

Create `backend/.gitignore`:

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Temporary files
tmp/
temp/

# Tokens
tokens.json
```

### Create Environment Template

Create `backend/.env.example`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_PROJECT_ID=your_project_id_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
CALENDAR_ID=primary

# Somnia Network Configuration
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50311
SOMNIA_EXPLORER_URL=https://somnia.explorer.caldera.xyz
SOMNIA_NETWORK=testnet

# Somnia Data Streams
STREAMS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Security
ENCRYPTION_KEY=your_32_byte_encryption_key_here_change_in_production

# Monitoring
CALENDAR_POLL_INTERVAL=30
LOG_LEVEL=info
```

### Install Backend Dependencies

```bash
npm install
```

Expected output:
```
added 427 packages in 23s
```

## 📦 Step 3: Initialize Frontend

```bash
cd ../frontend
```

### Create Frontend with Next.js

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted, select:
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router
- ❌ Turbopack
- ✅ Import alias (@/*)

### Update Frontend package.json

Add these dependencies to `frontend/package.json`:

```json
{
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "tailwind-merge": "^2.1.0",
    "recharts": "^2.10.3",
    "socket.io-client": "^4.7.2",
    "zod": "^3.22.4"
  }
}
```

Install additional dependencies:

```bash
npm install
```

## 🔧 Step 4: Create Base Server File

Create `backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

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
    network: process.env.SOMNIA_NETWORK || 'testnet'
  });
});

// API routes (will be added in following chunks)
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendar: '/api/calendar/*',
      transactions: '/api/transactions/*',
      wallet: '/api/wallet/*'
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
  logger.info(`🔗 Network: ${process.env.SOMNIA_NETWORK || 'testnet'}`);
  logger.info(`📅 Calendar polling interval: ${process.env.CALENDAR_POLL_INTERVAL || 30}s`);
  logger.info(`💡 Health check: http://localhost:${PORT}/health`);
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

## 🎨 Step 5: Create Basic Frontend Layout

Create `frontend/app/page.tsx`:

```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          ⏰ Tempora
        </h1>
        <p className="text-center text-lg text-gray-600 mb-8">
          Transform your Google Calendar into a DeFi automation platform
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <p className="text-center text-gray-500">
            Frontend is ready! Backend API will be connected in upcoming chunks.
          </p>
        </div>
      </div>
    </main>
  );
}
```

## 🧪 Step 6: Test Your Setup

### Test Backend

```bash
cd backend

# Create logs directory
mkdir -p logs

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

Expected output:
```
🚀 Tempora backend running on port 3001
📊 Environment: development
🔗 Network: testnet
📅 Calendar polling interval: 30s
💡 Health check: http://localhost:3001/health
```

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Tempora Backend",
  "version": "1.0.0",
  "network": "testnet"
}
```

### Test Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

Visit: http://localhost:3000

You should see the Tempora landing page!

## 📚 Step 7: Create Project README

Create `README.md` in the root directory:

```markdown
# ⏰ Tempora

Transform your Google Calendar into a powerful DeFi automation platform on Somnia Network.

## What is Tempora?

Tempora allows you to:
- Schedule cryptocurrency swaps using calendar events
- Automate token transactions
- Track all operations on Somnia Data Streams
- No wallet connection required (deterministic wallets)

## Quick Start

### Prerequisites
- Node.js 20+
- Google Calendar account
- Somnia testnet tokens (get from faucet)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tempora.git
cd tempora
```

2. Install dependencies:
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

3. Configure environment:
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
```

4. Start services:
```bash
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd frontend && npm run dev
```

## Architecture

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js 14 + React + TailwindCSS
- **Blockchain**: Somnia Network (EVM)
- **Data Layer**: Somnia Data Streams
- **Calendar**: Google Calendar API

## Documentation

Follow the step-by-step guides in `/docs`:
1. [Project Setup](docs/01-project-setup.md) ← You are here
2. [Google Calendar Integration](docs/02-google-calendar-setup.md)
3. [Somnia Wallet Service](docs/03-somnia-wallet-service.md)
4. [Data Streams Integration](docs/04-data-streams-setup.md)
5. [Transaction Execution](docs/05-transaction-execution.md)
6. [Calendar Monitoring](docs/06-calendar-agent.md)
7. [Frontend Dashboard](docs/07-frontend-dashboard.md)
8. [Testing & Deployment](docs/08-testing-deployment.md)

## Features

- ✅ Calendar-based transaction scheduling
- ✅ Automated swap execution
- ✅ Somnia Data Streams integration
- ✅ Real-time updates
- ✅ No wallet connection required
- ✅ Transaction history on-chain

## Tech Stack

**Backend:**
- Express.js
- TypeScript
- Viem (wallet management)
- @somnia-chain/streams
- Google Calendar API
- node-cron

**Frontend:**
- Next.js 14
- React 18
- TailwindCSS
- shadcn/ui
- WebSockets

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.
```

## 🎉 What You've Built

Congratulations! You now have:

✅ Complete project structure
✅ Backend with Express + TypeScript
✅ Frontend with Next.js + React
✅ Development environment configured
✅ Git repository initialized
✅ Health check endpoint working
✅ Logging system set up
✅ Error handling in place

## 📁 Final Project Structure

```
tempora/
├── backend/
│   ├── src/
│   │   ├── services/         # Business logic (calendar, blockchain, etc.)
│   │   ├── routes/           # API endpoints
│   │   ├── schemas/          # Data Streams schemas
│   │   ├── utils/            # Helper functions
│   │   └── server.ts         # Express server ✅
│   ├── logs/                 # Log files
│   ├── .env.example          # Environment template ✅
│   ├── .gitignore           # Git ignore rules ✅
│   ├── tsconfig.json        # TypeScript config ✅
│   └── package.json         # Dependencies ✅
├── frontend/
│   ├── app/
│   │   └── page.tsx         # Landing page ✅
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   ├── hooks/               # Custom hooks
│   ├── .gitignore          # Git ignore rules ✅
│   ├── tsconfig.json       # TypeScript config ✅
│   └── package.json        # Dependencies ✅
├── docs/                    # Documentation
│   └── 01-project-setup.md ← You are here
└── README.md               # Project overview ✅
```

## 🐛 Common Issues & Solutions

### Issue: Port 3001 already in use
**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Issue: TypeScript compilation errors
**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: Module not found errors
**Solution:**
Make sure you're in the correct directory and dependencies are installed:
```bash
npm install
```

## 📖 Next Steps

In the next chunk, you'll:
1. Set up Google Cloud Console
2. Enable Calendar API
3. Configure OAuth 2.0
4. Implement CalendarService
5. Test calendar integration

**Continue to:** [Chunk 2: Google Calendar Integration →](02-google-calendar-setup.md)

---

**Questions or Issues?** Open an issue on GitHub or check the troubleshooting section in Chunk 8.

