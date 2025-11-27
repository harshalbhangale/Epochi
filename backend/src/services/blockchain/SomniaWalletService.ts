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
  id: 50312,
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
 * SomniaWalletService manages blockchain wallets for Epochi
 * Uses deterministic wallet generation - no user wallet needed
 */
export class SomniaWalletService {
  private publicClient: PublicClient;
  private walletCache: Map<string, WalletClient> = new Map();

  constructor() {
    // Initialize public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL),
    });

    console.log('✅ Somnia Wallet Service initialized');
    console.log(`🔗 Connected to: ${somniaTestnet.name}`);
    console.log(`📡 RPC: ${process.env.SOMNIA_RPC_URL || somniaTestnet.rpcUrls.default.http[0]}`);
  }

  /**
   * Generate deterministic private key from calendar ID
   * Uses HMAC-SHA256 for secure, reproducible key generation
   */
  private generatePrivateKey(calendarId: string): `0x${string}` {
    // Use HMAC with a secret for added security
    const secret = process.env.ENCRYPTION_KEY || 'epochi-secret-key-change-in-production';
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
      transport: http(process.env.SOMNIA_RPC_URL),
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

      // Get gas price
      const gasPrice = await this.publicClient.getGasPrice();
      
      // Estimate gas
      const gasEstimate = await this.estimateGas(calendarId, to, value);

      // Send transaction with gas parameters
      const hash = await walletClient.sendTransaction({
        to,
        value,
        gas: gasEstimate,
        gasPrice: gasPrice,
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
        rpcUrl: process.env.SOMNIA_RPC_URL || somniaTestnet.rpcUrls.default.http[0],
        explorerUrl: somniaTestnet.blockExplorers.default.url,
      };
    } catch (error) {
      console.error('❌ Error getting network status:', error);
      throw new Error('Failed to get network status');
    }
  }
}

export default SomniaWalletService;

