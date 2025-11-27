# ⏰ Epochi

> Transform your Google Calendar into a powerful DeFi automation platform on Somnia Network.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Somnia Network](https://img.shields.io/badge/Somnia-Testnet-purple)](https://somnia.network)

## 🚀 What is Epochi?

Epochi allows you to schedule cryptocurrency transactions using calendar events. No wallet connection required!

**Example**: Create a calendar event `"Send 1 STT to 0x..."` → Transaction executes automatically at the scheduled time.

![Epochi Dashboard](https://via.placeholder.com/800x400?text=Epochi+Dashboard)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Deterministic Wallets** | No MetaMask required - wallets generated automatically |
| 📅 **Calendar Integration** | Schedule transactions via Google Calendar |
| ⚡ **Somnia Network** | Ultra-fast, low-cost transactions |
| 📊 **Data Streams** | Immutable on-chain transaction records |
| 🤖 **Automated Agent** | Monitors and executes transactions 24/7 |
| 🎨 **Modern UI** | Beautiful dashboard with real-time updates |

## 🏗️ Project Structure

```
epochi/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── services/     # Business logic
│   │   │   ├── blockchain/   # Wallet & Data Streams
│   │   │   ├── calendar/     # Google Calendar & Parser
│   │   │   └── monitoring/   # Calendar Agent
│   │   ├── routes/       # API endpoints
│   │   ├── schemas/      # Data Streams schemas
│   │   └── server.ts     # Express server
│   ├── Dockerfile
│   └── package.json
├── frontend/             # Next.js dashboard
│   ├── app/
│   ├── components/       # React components
│   ├── lib/              # API client
│   ├── Dockerfile
│   └── package.json
├── scripts/              # Deployment scripts
├── docker-compose.yml    # Full stack deployment
└── docs/                 # Documentation (8 chunks)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Google Cloud Project with Calendar API enabled

### 1. Clone & Install

```bash
git clone https://github.com/harshalbhangale/Epochi.git
cd Epochi

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your Google OAuth credentials and encryption key
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 4. Authenticate & Test

1. Visit http://localhost:3001/api/calendar/auth
2. Sign in with Google and grant calendar permissions
3. Visit http://localhost:3000 to see the dashboard
4. Create a calendar event: `"Send 0.001 STT to 0x855bc3e892f22e8c9c99525799b885d5884471dd"`
5. Watch the agent detect and execute the transaction!

## 🐳 Docker Deployment

### Quick Deploy

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Use deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🧪 Testing

### Run E2E Tests

```bash
chmod +x scripts/test-e2e.sh
./scripts/test-e2e.sh
```

### Manual API Tests

```bash
# Health check
curl http://localhost:3001/health

# Calendar status
curl http://localhost:3001/api/calendar/status

# Wallet info
curl http://localhost:3001/api/wallet/primary

# Agent status
curl http://localhost:3001/api/agent/status

# Start agent
curl -X POST http://localhost:3001/api/agent/start
```

## 📚 Documentation

| Chunk | Description | Status |
|-------|-------------|--------|
| 1 | [Project Setup](docs/01-project-setup.md) | ✅ Complete |
| 2 | [Google Calendar Integration](docs/02-google-calendar-setup.md) | ✅ Complete |
| 3 | [Somnia Wallet Service](docs/03-somnia-wallet-service.md) | ✅ Complete |
| 4 | [Data Streams Setup](docs/04-data-streams-setup.md) | ⚠️ Partial |
| 5 | [Transaction Execution](docs/05-transaction-execution.md) | ✅ Complete |
| 6 | [Calendar Agent](docs/06-calendar-agent.md) | ✅ Complete |
| 7 | [Frontend Dashboard](docs/07-frontend-dashboard.md) | ✅ Complete |
| 8 | [Testing & Deployment](docs/08-testing-deployment.md) | ✅ Complete |

## 🔧 Tech Stack

### Backend
- **Express.js** + TypeScript
- **Viem** - Ethereum/Somnia interactions
- **@somnia-chain/streams** - Data Streams SDK
- **Google APIs** - Calendar integration
- **node-cron** - Scheduled tasks
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Frontend
- **Next.js 14** - React framework
- **TailwindCSS** - Styling
- **Axios** - API client
- **Lucide React** - Icons

### Blockchain
- **Somnia Network** (Testnet)
- **Chain ID**: 50312
- **RPC**: https://dream-rpc.somnia.network

## 📝 Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# Google Calendar API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Somnia Network
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312

# Security
ENCRYPTION_KEY=your_32_char_key

# Monitoring
CALENDAR_POLL_INTERVAL=30
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔐 Security

- ✅ Helmet security headers
- ✅ Rate limiting (100 req/15min in production)
- ✅ CORS configuration
- ✅ Environment validation
- ✅ Secure encryption key requirement

## 🎯 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/calendar/auth` | GET | Google OAuth URL |
| `/api/calendar/events` | GET | List calendar events |
| `/api/wallet/:id` | GET | Wallet info |
| `/api/agent/status` | GET | Agent status |
| `/api/agent/start` | POST | Start agent |
| `/api/agent/stop` | POST | Stop agent |
| `/api/agent/queue` | GET | Pending transactions |

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **GitHub**: https://github.com/harshalbhangale/Epochi
- **Somnia Network**: https://somnia.network
- **Somnia Docs**: https://docs.somnia.network
- **Somnia Faucet**: https://faucet.somnia.network
- **Explorer**: https://shannon-explorer.somnia.network

---

**Built with ❤️ on Somnia Network**

*Schedule your DeFi, simplify your life.*
