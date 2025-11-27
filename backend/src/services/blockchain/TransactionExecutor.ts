import { parseEther, type Address } from 'viem';
import SomniaWalletService from './SomniaWalletService';
import DataStreamsService from './DataStreamsService';
import { TransactionStatus } from '../../schemas/transaction.schema';
import { ParsedTransaction } from '../calendar/EventParser';

/**
 * Execution result interface
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  amountReceived?: string;
  error?: string;
  streamTxHash?: string;
}

/**
 * Token addresses on Somnia (placeholder - update with real addresses)
 */
const TOKEN_ADDRESSES: { [key: string]: Address } = {
  ETH: '0x0000000000000000000000000000000000000000', // Native token
  STT: '0x0000000000000000000000000000000000000000', // Native token (Somnia Test Token)
  USDC: '0x1234567890123456789012345678901234567890', // Placeholder
  USDT: '0x2345678901234567890123456789012345678901', // Placeholder
  DAI: '0x3456789012345678901234567890123456789012',  // Placeholder
};

/**
 * TransactionExecutor handles transaction execution and recording
 */
export class TransactionExecutor {
  private walletService: SomniaWalletService;
  private dataStreamsService: DataStreamsService;

  constructor(
    walletService: SomniaWalletService,
    dataStreamsService: DataStreamsService
  ) {
    this.walletService = walletService;
    this.dataStreamsService = dataStreamsService;
  }

  /**
   * Execute a parsed transaction
   */
  async executeTransaction(
    parsed: ParsedTransaction,
    calendarId: string
  ): Promise<ExecutionResult> {
    console.log(`🚀 Executing transaction: ${parsed.eventTitle}`);

    try {
      // Get wallet info
      const walletInfo = await this.walletService.getWalletInfo(calendarId);
      console.log(`💰 Wallet balance: ${walletInfo.balanceFormatted} STT`);

      // Check if execution time has arrived
      const now = new Date();
      if (parsed.executionTime > now) {
        const waitTime = Math.floor((parsed.executionTime.getTime() - now.getTime()) / 1000);
        return {
          success: false,
          error: `Transaction scheduled for ${parsed.executionTime.toISOString()} (in ${waitTime}s)`
        };
      }

      // Execute based on type
      if (parsed.type === 'swap') {
        return await this.executeSwap(parsed, calendarId, walletInfo.address);
      } else if (parsed.type === 'transfer') {
        return await this.executeTransfer(parsed, calendarId, walletInfo.address);
      }

      return {
        success: false,
        error: 'Unknown transaction type'
      };
    } catch (error: any) {
      console.error('❌ Transaction execution failed:', error);
      return {
        success: false,
        error: error.message || 'Transaction execution failed'
      };
    }
  }

  /**
   * Execute a swap transaction (simplified for MVP)
   */
  private async executeSwap(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address
  ): Promise<ExecutionResult> {
    console.log(`🔄 Executing swap: ${parsed.amount} ${parsed.fromToken} → ${parsed.toToken}`);

    try {
      // For MVP: Simulate swap by checking balance and creating record
      // In production: Integrate with actual DEX (Uniswap V3, etc.)
      
      const amount = parseEther(parsed.amount);
      
      // Check sufficient balance
      const hasFunds = await this.walletService.hasSufficientBalance(calendarId, amount);
      if (!hasFunds) {
        return {
          success: false,
          error: 'Insufficient balance for swap'
        };
      }

      // Simulate swap execution (replace with actual DEX integration)
      console.log(`💱 Simulating swap on DEX...`);
      
      // For demo: Create a mock transaction hash
      const mockTxHash = `0x${Date.now().toString(16)}${'0'.repeat(50)}`.slice(0, 66);
      
      // Simulate amount received (mock exchange rate: 1 ETH = 2500 USDC)
      const exchangeRate = parsed.toToken === 'USDC' ? 2500 : 1;
      const amountReceived = (parseFloat(parsed.amount) * exchangeRate).toString();

      console.log(`✅ Swap executed! Received ~${amountReceived} ${parsed.toToken}`);

      // Record to Data Streams (but don't fail if this fails)
      let streamTxHash = '';
      try {
        streamTxHash = await this.recordTransaction(
          parsed,
          calendarId,
          userWallet,
          amount,
          parseEther(amountReceived),
          mockTxHash,
          TransactionStatus.EXECUTED,
          `Swapped ${parsed.amount} ${parsed.fromToken} for ${amountReceived} ${parsed.toToken}`
        );
      } catch (streamError: any) {
        console.error('⚠️  Failed to record to Data Streams (non-fatal):', streamError.message);
      }

      return {
        success: true,
        txHash: mockTxHash,
        explorerUrl: `https://somnia.explorer.caldera.xyz/tx/${mockTxHash}`,
        amountReceived,
        streamTxHash
      };
    } catch (error: any) {
      console.error('❌ Swap execution failed:', error);
      
      // Record failed transaction to Data Streams
      await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        parseEther(parsed.amount),
        BigInt(0),
        '',
        TransactionStatus.FAILED,
        `Swap failed: ${error.message}`
      ).catch(() => {
        // Ignore errors when recording failed transactions
      });

      return {
        success: false,
        error: error.message || 'Swap execution failed'
      };
    }
  }

  /**
   * Execute a transfer transaction
   */
  private async executeTransfer(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address
  ): Promise<ExecutionResult> {
    console.log(`💸 Executing transfer: ${parsed.amount} ${parsed.fromToken} to ${parsed.toToken}`);

    try {
      const amount = parsed.amount;
      const recipient = parsed.toToken as Address; // In transfers, toToken is the recipient address

      // Execute the transfer
      const result = await this.walletService.sendTransaction(
        calendarId,
        recipient,
        amount
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      console.log(`✅ Transfer executed! Hash: ${result.hash}`);

      // Record to Data Streams (but don't fail if this fails)
      let streamTxHash = '';
      try {
        streamTxHash = await this.recordTransaction(
          parsed,
          calendarId,
          userWallet,
          parseEther(amount),
          parseEther(amount),
          result.hash || '',
          TransactionStatus.EXECUTED,
          `Transferred ${amount} ${parsed.fromToken} to ${recipient}`
        );
      } catch (streamError: any) {
        console.error('⚠️  Failed to record to Data Streams (non-fatal):', streamError.message);
      }

      return {
        success: true,
        txHash: result.hash,
        explorerUrl: result.explorerUrl,
        amountReceived: amount,
        streamTxHash
      };
    } catch (error: any) {
      console.error('❌ Transfer execution failed:', error);

      // Record failed transaction
      await this.recordTransaction(
        parsed,
        calendarId,
        userWallet,
        parseEther(parsed.amount),
        BigInt(0),
        '',
        TransactionStatus.FAILED,
        `Transfer failed: ${error.message}`
      ).catch(() => {
        // Ignore errors when recording failed transactions
      });

      return {
        success: false,
        error: error.message || 'Transfer execution failed'
      };
    }
  }

  /**
   * Record transaction to Data Streams
   */
  private async recordTransaction(
    parsed: ParsedTransaction,
    calendarId: string,
    userWallet: Address,
    amount: bigint,
    amountReceived: bigint,
    txHash: string,
    status: TransactionStatus,
    notes: string
  ): Promise<string> {
    try {
      const txRecord = this.dataStreamsService.createTransactionRecord(
        calendarId,
        parsed.eventId,
        userWallet,
        parsed.fromToken,
        parsed.toToken,
        amount,
        amountReceived,
        txHash,
        status,
        notes
      );

      const streamTxHash = await this.dataStreamsService.writeTransaction(txRecord);
      console.log(`📊 Transaction recorded to Data Streams: ${streamTxHash}`);

      return streamTxHash;
    } catch (error) {
      console.error('❌ Failed to record to Data Streams:', error);
      throw error;
    }
  }

  /**
   * Get token address by symbol
   */
  private getTokenAddress(symbol: string): Address {
    return TOKEN_ADDRESSES[symbol] || TOKEN_ADDRESSES.ETH;
  }
}

export default TransactionExecutor;

