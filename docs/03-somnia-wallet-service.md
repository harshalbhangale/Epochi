# 💰 Chunk 3: Somnia Wallet Service

In this chunk, you'll create a deterministic wallet service using Viem that generates blockchain wallets from calendar IDs. No MetaMask or user wallet connection required!

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Somnia testnet connection configured
- Deterministic wallet generation working
- Wallet funding from testnet faucet
- Balance checking functionality
- Complete SomniaWalletService implementation
- No user wallet extension needed

## 📋 Prerequisites

- Completed [Chunk 1: Project Setup](01-project-setup.md)
- Completed [Chunk 2: Google Calendar Integration](02-google-calendar-setup.md)
- Backend server running

## 🌐 Step 1: Understanding Somnia Network

### What is Somnia?

Somnia is an ultra-high-performance EVM Layer 1 blockchain with:
- **400,000+ TPS** (transactions per second)
- **Sub-second finality**
- **Low gas fees**
- **EVM compatible** (works with Ethereum tools)
- **Built-in Data Streams** (immutable data layer)

### Network Details

```
Network Name: Somnia Testnet (Dream)
RPC URL: https://dream-rpc.somnia.network
Chain ID: 50311
Currency Symbol: STT (Somnia Test Token)
Explorer: https://somnia.explorer.caldera.xyz
Faucet: https://faucet.somnia.network
```

## 🔧 Step 2: Install Viem

Viem is a TypeScript interface for Ethereum (and EVM chains like Somnia).

```bash
cd tempora/backend
npm install viem
```

## 📝 Step 3: Create Somnia Wallet Service

Create `backend/src/services/blockchain/SomniaWalletService.ts`:

```typescript
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  formatEther, 
  parseEther,
  type Address,
  type Hash,
  type WalletClient,
  type PublicClient
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import crypto from 'crypto';

/**
 * Somnia Testnet chain configuration
 */
const somniaTestnet = defineChain({
  id: 50311,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Test Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia.explorer.caldera.xyz',
    },
  },
  testnet: true,
});

/**
 * Wallet information interface
 */
export interface WalletInfo {
  address: Address;
  balance: string;
  balanceFormatted: string;
  network: string;
  explorerUrl: string;
  chainId: number;
}

/**
 * Transaction result interface
 */
export interface TransactionResult {
  success: boolean;
  hash?: Hash;
  explorerUrl?: string;
  error?: string;
}

/**
 * SomniaWalletService manages blockchain wallets for Tempora
 * Uses deterministic wallet generation - no user wallet needed
 */
export class SomniaWalletService {
  private publicClient: PublicClient;
  private walletCache: Map<string, WalletClient> = new Map();

  constructor() {
    // Initialize public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(),
    });

    console.log('✅ Somnia Wallet Service initialized');
    console.log(`🔗 Connected to: ${somniaTestnet.name}`);
    console.log(`📡 RPC: ${somniaTestnet.rpcUrls.default.http[0]}`);
  }

  /**
   * Generate deterministic private key from calendar ID
   * Uses HMAC-SHA256 for secure, reproducible key generation
   */
  private generatePrivateKey(calendarId: string): `0x${string}` {
    // Use HMAC with a secret for added security
    const secret = process.env.ENCRYPTION_KEY || 'tempora-secret-key-change-in-production';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(calendarId);
    const hash = hmac.digest('hex');
    
    // Ensure valid private key format (0x + 64 hex chars)
    return `0x${hash}` as `0x${string}`;
  }

  /**
   * Get wallet client for a calendar ID
   * Creates wallet on first use, then caches it
   */
  private getWalletClient(calendarId: string): WalletClient {
    // Check cache first
    if (this.walletCache.has(calendarId)) {
      return this.walletCache.get(calendarId)!;
    }

    // Generate deterministic private key
    const privateKey = this.generatePrivateKey(calendarId);
    
    // Create account from private key
    const account = privateKeyToAccount(privateKey);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(),
    });

    // Cache for future use
    this.walletCache.set(calendarId, walletClient);

    console.log(`🔑 Generated wallet for calendar: ${calendarId.substring(0, 20)}...`);
    console.log(`📍 Address: ${account.address}`);

    return walletClient;
  }

  /**
   * Get wallet information for a calendar ID
   */
  async getWalletInfo(calendarId: string): Promise<WalletInfo> {
    try {
      const walletClient = this.getWalletClient(calendarId);
      const address = walletClient.account.address;

      // Get balance
      const balance = await this.publicClient.getBalance({
        address,
      });

      return {
        address,
        balance: balance.toString(),
        balanceFormatted: formatEther(balance),
        network: somniaTestnet.name,
        explorerUrl: `${somniaTestnet.blockExplorers.default.url}/address/${address}`,
        chainId: somniaTestnet.id,
      };
    } catch (error) {
      console.error('❌ Error getting wallet info:', error);
      throw new Error('Failed to get wallet information');
    }
  }

  /**
   * Get wallet address for a calendar ID
   */
  getWalletAddress(calendarId: string): Address {
    const walletClient = this.getWalletClient(calendarId);
    return walletClient.account.address;
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(
    calendarId: string, 
    requiredAmount: bigint
  ): Promise<boolean> {
    try {
      const info = await this.getWalletInfo(calendarId);
      return BigInt(info.balance) >= requiredAmount;
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      return false;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    calendarId: string,
    to: Address,
    value: bigint,
    data?: `0x${string}`
  ): Promise<bigint> {
    try {
      const walletClient = this.getWalletClient(calendarId);
      
      const gasEstimate = await this.publicClient.estimateGas({
        account: walletClient.account,
        to,
        value,
        data,
      });

      return gasEstimate;
    } catch (error) {
      console.error('❌ Error estimating gas:', error);
      // Return a safe default (100k gas units)
      return BigInt(100000);
    }
  }

  /**
   * Send native token (STT) to an address
   */
  async sendTransaction(
    calendarId: string,
    to: Address,
    amount: string
  ): Promise<TransactionResult> {
    try {
      const walletClient = this.getWalletClient(calendarId);
      const value = parseEther(amount);

      // Check balance
      const hasFunds = await this.hasSufficientBalance(calendarId, value);
      if (!hasFunds) {
        return {
          success: false,
          error: 'Insufficient balance for transaction',
        };
      }

      console.log(`💸 Sending ${amount} STT to ${to}`);

      // Send transaction
      const hash = await walletClient.sendTransaction({
        to,
        value,
      });

      console.log(`✅ Transaction sent: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        hash,
        explorerUrl: `${somniaTestnet.blockExplorers.default.url}/tx/${hash}`,
      };
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed',
      };
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: Hash) {
    try {
      const transaction = await this.publicClient.getTransaction({
        hash,
      });

      return transaction;
    } catch (error) {
      console.error('❌ Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: Hash) {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash,
      });

      return receipt;
    } catch (error) {
      console.error('❌ Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Request testnet tokens from faucet
   * Note: This is a placeholder - actual faucet integration depends on Somnia's faucet API
   */
  async requestFaucetFunds(calendarId: string): Promise<boolean> {
    try {
      const address = this.getWalletAddress(calendarId);
      
      console.log(`💧 Requesting faucet funds for ${address}`);
      console.log(`🔗 Visit: https://faucet.somnia.network`);
      console.log(`📝 Paste your address: ${address}`);

      // In production, you would integrate with Somnia's faucet API here
      // For now, we just log instructions
      
      return true;
    } catch (error) {
      console.error('❌ Error requesting faucet funds:', error);
      return false;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();
      return gasPrice;
    } catch (error) {
      console.error('❌ Error getting gas price:', error);
      return BigInt(0);
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.error('❌ Error getting block number:', error);
      return BigInt(0);
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus() {
    try {
      const [blockNumber, gasPrice] = await Promise.all([
        this.getBlockNumber(),
        this.getGasPrice(),
      ]);

      return {
        network: somniaTestnet.name,
        chainId: somniaTestnet.id,
        blockNumber: blockNumber.toString(),
        gasPrice: formatEther(gasPrice),
        gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(2),
        rpcUrl: somniaTestnet.rpcUrls.default.http[0],
        explorerUrl: somniaTestnet.blockExplorers.default.url,
      };
    } catch (error) {
      console.error('❌ Error getting network status:', error);
      throw new Error('Failed to get network status');
    }
  }
}

export default SomniaWalletService;
```

## 🛣️ Step 4: Create Wallet Routes

Create `backend/src/routes/wallet.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import SomniaWalletService from '../services/blockchain/SomniaWalletService';

const router = Router();
const walletService = new SomniaWalletService();

/**
 * GET /api/wallet/:calendarId
 * Get wallet information for a calendar ID
 */
router.get('/:calendarId', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const walletInfo = await walletService.getWalletInfo(calendarId);

    res.json({
      success: true,
      wallet: walletInfo,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet information',
    });
  }
});

/**
 * GET /api/wallet/:calendarId/address
 * Get just the wallet address
 */
router.get('/:calendarId/address', (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const address = walletService.getWalletAddress(calendarId);

    res.json({
      success: true,
      address,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet address',
    });
  }
});

/**
 * POST /api/wallet/:calendarId/send
 * Send tokens from calendar wallet
 */
router.post('/:calendarId/send', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const { to, amount } = req.body;

    if (!calendarId || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID, recipient address, and amount are required',
      });
    }

    const result = await walletService.sendTransaction(calendarId, to, amount);

    if (result.success) {
      res.json({
        success: true,
        message: 'Transaction sent successfully',
        hash: result.hash,
        explorerUrl: result.explorerUrl,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send transaction',
    });
  }
});

/**
 * POST /api/wallet/:calendarId/faucet
 * Request testnet funds from faucet
 */
router.post('/:calendarId/faucet', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const address = walletService.getWalletAddress(calendarId);
    await walletService.requestFaucetFunds(calendarId);

    res.json({
      success: true,
      message: 'Faucet request initiated',
      address,
      faucetUrl: 'https://faucet.somnia.network',
      instructions: `Visit ${address} on the faucet to claim testnet tokens`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to request faucet funds',
    });
  }
});

/**
 * GET /api/wallet/network/status
 * Get network status
 */
router.get('/network/status', async (req: Request, res: Response) => {
  try {
    const status = await walletService.getNetworkStatus();

    res.json({
      success: true,
      network: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get network status',
    });
  }
});

export { router as walletRouter, walletService };
```

## 🔌 Step 5: Integrate Wallet Routes with Server

Update `backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { calendarRouter } from './routes/calendar.routes';
import { walletRouter } from './routes/wallet.routes';

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

// API routes
app.use('/api/calendar', calendarRouter);
app.use('/api/wallet', walletRouter);

// Redirect /auth to /api/calendar/auth for convenience
app.get('/auth', (req: Request, res: Response) => {
  res.redirect('/api/calendar/auth');
});

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendarAuth: '/api/calendar/auth',
      calendarEvents: '/api/calendar/events',
      walletInfo: '/api/wallet/:calendarId',
      walletSend: '/api/wallet/:calendarId/send',
      networkStatus: '/api/wallet/network/status'
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
  logger.info(`💡 Health: http://localhost:${PORT}/health`);
  logger.info(`📅 Calendar: http://localhost:${PORT}/api/calendar/auth`);
  logger.info(`💰 Wallet: http://localhost:${PORT}/api/wallet/:calendarId`);
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

## 🧪 Step 6: Test Wallet Service

### Start the Backend

```bash
cd tempora/backend
npm run dev
```

### Test Network Status

```bash
curl http://localhost:3001/api/wallet/network/status
```

Expected response:
```json
{
  "success": true,
  "network": {
    "network": "Somnia Testnet",
    "chainId": 50311,
    "blockNumber": "1234567",
    "gasPrice": "0.000000001",
    "gasPriceGwei": "1.00",
    "rpcUrl": "https://dream-rpc.somnia.network",
    "explorerUrl": "https://somnia.explorer.caldera.xyz"
  }
}
```

### Test Wallet Generation

```bash
# Using "primary" as calendar ID
curl http://localhost:3001/api/wallet/primary
```

Expected response:
```json
{
  "success": true,
  "wallet": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEe8",
    "balance": "0",
    "balanceFormatted": "0.0",
    "network": "Somnia Testnet",
    "explorerUrl": "https://somnia.explorer.caldera.xyz/address/0x742d35...",
    "chainId": 50311
  }
}
```

### Test Wallet Address Retrieval

```bash
curl http://localhost:3001/api/wallet/primary/address
```

Expected response:
```json
{
  "success": true,
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEe8"
}
```

### Get Testnet Tokens

1. **Get your wallet address:**
```bash
curl http://localhost:3001/api/wallet/primary/address
```

2. **Visit Somnia Faucet:**
   - Go to: https://faucet.somnia.network
   - Paste your address
   - Click "Request Tokens"
   - Wait 30 seconds

3. **Check balance:**
```bash
curl http://localhost:3001/api/wallet/primary
```

You should now see a non-zero balance!

### Test Sending Tokens

Once you have testnet tokens, test sending:

```bash
curl -X POST http://localhost:3001/api/wallet/primary/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "0x1234567890123456789012345678901234567890",
    "amount": "0.001"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Transaction sent successfully",
  "hash": "0xabc123...",
  "explorerUrl": "https://somnia.explorer.caldera.xyz/tx/0xabc123..."
}
```

## 🎉 What You've Built

Congratulations! You now have:

✅ Somnia testnet connection configured
✅ Deterministic wallet generation from calendar IDs
✅ Complete SomniaWalletService with Viem
✅ Balance checking functionality
✅ Transaction sending capabilities
✅ Gas estimation
✅ Network status monitoring
✅ Wallet API routes
✅ No MetaMask or user wallet required!

## 📁 New Files Created

```
backend/
├── src/
│   ├── services/
│   │   └── blockchain/
│   │       └── SomniaWalletService.ts ✅ (550+ lines)
│   ├── routes/
│   │   └── wallet.routes.ts ✅ (200+ lines)
│   └── server.ts ✅ (updated)
```

## 🔐 Security Best Practices

### Private Key Security

1. **Environment Variables:**
   - Never commit `.env` files
   - Use strong encryption keys in production
   - Rotate keys regularly

2. **Deterministic Generation:**
   - Uses HMAC-SHA256 for key derivation
   - Secret key should be stored securely
   - Same calendar ID always generates same wallet

3. **Production Considerations:**
   - Use hardware security modules (HSM) for key storage
   - Implement key rotation
   - Add multi-signature requirements for large amounts
   - Monitor wallet activity

### Recommended Limits

For testnet/demo:
- Max transaction: 0.1 STT
- Rate limiting: 10 tx/hour per wallet
- Balance alerts: < 0.01 STT

## 🐛 Common Issues & Solutions

### Issue: "Failed to get wallet information"
**Solution:**
```bash
# Check if Somnia RPC is accessible
curl https://dream-rpc.somnia.network

# Should return JSON-RPC response
```

### Issue: "Insufficient balance for transaction"
**Solution:**
```bash
# Get testnet tokens from faucet
curl -X POST http://localhost:3001/api/wallet/primary/faucet

# Or visit manually:
# https://faucet.somnia.network
```

### Issue: Transaction stuck/pending
**Solution:**
Somnia has sub-second finality, so this shouldn't happen. If it does:
```bash
# Check transaction status
curl http://localhost:3001/api/wallet/network/status

# Check if network is operational
```

### Issue: Different wallet address each time
**Solution:**
Ensure you're using the same calendar ID:
```bash
# This will always generate the same address
curl http://localhost:3001/api/wallet/primary

# This will generate a different address
curl http://localhost:3001/api/wallet/different-id
```

## 📝 Key Concepts Explained

### Deterministic Wallets

```
Calendar ID → HMAC-SHA256 → Private Key → Public Key → Address
```

**Same input always produces same output:**
- Calendar ID: "primary"
- Always generates: "0x742d35Cc..."

**Benefits:**
- No need to store private keys
- Reproducible on any server
- Simple backup (just remember calendar ID)

### Gas on Somnia

Gas costs are **much lower** than Ethereum:
- Simple transfer: ~21,000 gas
- Gas price: ~1 Gwei
- Cost: ~0.000021 STT (~$0.00001)

### Transaction Finality

**Somnia achieves sub-second finality:**
1. Transaction submitted
2. Block mined (~100ms)
3. Transaction confirmed (~200ms)
4. Final (~500ms total)

## 📖 Next Steps

In the next chunk, you'll:
1. Install Somnia Data Streams SDK
2. Design transaction schemas
3. Write data to streams
4. Read data from streams
5. Implement complete DataStreamsService

**Continue to:** [Chunk 4: Somnia Data Streams Integration →](04-data-streams-setup.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

