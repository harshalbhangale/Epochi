# ⏰ Epochi

Transform your Google Calendar into a powerful DeFi automation platform on Somnia Network.

## 🚀 What is Epochi?

Epochi allows you to schedule cryptocurrency swaps using calendar events. No wallet connection required!

**Example**: Create a calendar event "Swap 0.1 ETH to USDC tomorrow at 2pm" → Transaction executes automatically at the scheduled time.

## ✨ Features

- 🔐 **Deterministic Wallets**: No MetaMask required
- 📅 **Calendar Integration**: Schedule transactions via Google Calendar  
- ⚡ **Somnia Network**: Ultra-fast, low-cost transactions
- 📊 **Data Streams**: Immutable on-chain transaction records
- 🤖 **Automated Agent**: Monitors and executes transactions
- 🎨 **Modern UI**: Beautiful dashboard with real-time updates

## 🏗️ Project Structure

```
epochi/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── services/    # Business logic
│   │   ├── routes/      # API endpoints
│   │   ├── schemas/     # Data Streams schemas
│   │   └── server.ts    # Express server ✅
│   └── package.json
├── frontend/         # Next.js dashboard ✅
│   ├── app/
│   │   └── page.tsx     # Landing page ✅
│   └── package.json
└── docs/            # Complete documentation (9 chunks)
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
npm install                    # ✅ Already done
cp .env.example .env           # ✅ Already done
# Edit .env with your credentials
npm run dev                    # Start backend server
```

### Frontend Setup

```bash
cd frontend
npm install                    # ✅ Already done
npm run dev                    # Start frontend dev server
```

Visit: http://localhost:3000

## 📚 Documentation

Follow our step-by-step guides in `/docs`:

0. ✅ [Hello World](docs/00-hello-world.md) - Learn Data Streams basics
1. ✅ [Project Setup](docs/01-project-setup.md) - **COMPLETE!**
2. ⏳ [Google Calendar Integration](docs/02-google-calendar-setup.md)
3. ⏳ [Somnia Wallet Service](docs/03-somnia-wallet-service.md)
4. ⏳ [Data Streams Setup](docs/04-data-streams-setup.md)
5. ⏳ [Transaction Execution](docs/05-transaction-execution.md)
6. ⏳ [Calendar Agent](docs/06-calendar-agent.md)
7. ⏳ [Frontend Dashboard](docs/07-frontend-dashboard.md)
8. ⏳ [Testing & Deployment](docs/08-testing-deployment.md)

## 🔧 Tech Stack

**Backend:**
- Express.js + TypeScript
- Viem (wallet management)
- @somnia-chain/streams
- Google Calendar API
- node-cron

**Frontend:**
- Next.js 14
- React 18
- TailwindCSS

**Blockchain:**
- Somnia Network (Testnet)
- Somnia Data Streams

## 🎯 Current Progress

✅ Git repository initialized  
✅ Backend with Express + TypeScript  
✅ 334 dependencies installed  
✅ Frontend with Next.js 14  
✅ 360 frontend dependencies installed  
✅ Landing page created  
✅ Environment configured  
✅ Basic server running  
⏳ Google Calendar integration (next)  
⏳ Wallet service  
⏳ Data Streams integration  
⏳ Transaction execution  
⏳ Calendar agent  
⏳ Frontend dashboard  

## 🧪 Testing

```bash
# Backend health
curl http://localhost:3001/health

# API status
curl http://localhost:3001/api/status

# Frontend
open http://localhost:3000
```

## 📝 Environment Variables

**Backend** (`backend/.env`):
- See `backend/.env.example` for all variables

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

---

**Built with ❤️ on Somnia Network**
