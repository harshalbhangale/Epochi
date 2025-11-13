import { SDK, SchemaEncoder, toHex } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import {
  TRANSACTION_SCHEMA,
  TransactionData,
  TransactionType,
  TransactionStatus,
  createTransactionId
} from '../../schemas/transaction.schema';

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
 * DataStreamsService handles all Data Streams operations
 */
export class DataStreamsService {
  private sdk: any;
  private schemaEncoder: SchemaEncoder;
  private schemaId: string = '';
  private publisherAddress: string;

  constructor(privateKey: string) {
    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    this.publisherAddress = account.address;

    // Create public client
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL),
    });

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(process.env.SOMNIA_RPC_URL),
    });

    // Initialize SDK
    this.sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    // Initialize schema encoder
    this.schemaEncoder = new SchemaEncoder(TRANSACTION_SCHEMA);

    console.log('✅ Data Streams Service initialized');
    console.log(`📍 Publisher address: ${this.publisherAddress}`);
  }

  /**
   * Compute schema ID (must be called after initialization)
   */
  async initialize(): Promise<void> {
    try {
      this.schemaId = await this.sdk.streams.computeSchemaId(TRANSACTION_SCHEMA);
      console.log(`🔑 Schema ID: ${this.schemaId}`);
    } catch (error) {
      console.error('❌ Error computing schema ID:', error);
      throw error;
    }
  }

  /**
   * Write transaction record to Data Streams
   */
  async writeTransaction(data: TransactionData): Promise<string> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      // Encode the data
      const encodedData = this.schemaEncoder.encodeData([
        { name: 'timestamp', value: data.timestamp.toString(), type: 'uint64' },
        { name: 'transactionId', value: toHex(data.transactionId, { size: 32 }), type: 'bytes32' },
        { name: 'userWallet', value: data.userWallet, type: 'address' },
        { name: 'calendarId', value: data.calendarId, type: 'string' },
        { name: 'eventId', value: data.eventId, type: 'string' },
        { name: 'transactionType', value: data.transactionType, type: 'string' },
        { name: 'fromToken', value: data.fromToken, type: 'string' },
        { name: 'toToken', value: data.toToken, type: 'string' },
        { name: 'amount', value: data.amount.toString(), type: 'uint256' },
        { name: 'amountReceived', value: data.amountReceived.toString(), type: 'uint256' },
        { name: 'txHash', value: toHex(data.txHash, { size: 32 }), type: 'bytes32' },
        { name: 'status', value: data.status, type: 'string' },
        { name: 'notes', value: data.notes, type: 'string' },
      ]);

      console.log(`📝 Writing transaction to Data Streams: ${data.transactionId}`);

      // Write to Data Streams
      const txHash = await this.sdk.streams.set([
        {
          id: toHex(data.transactionId, { size: 32 }),
          schemaId: this.schemaId,
          data: encodedData,
        },
      ]);

      console.log(`✅ Transaction written to Data Streams: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Error writing to Data Streams:', error);
      throw error;
    }
  }

  /**
   * Read transaction record from Data Streams
   */
  async readTransaction(
    transactionId: string,
    publisherAddress: string
  ): Promise<TransactionData | null> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      const dataKey = toHex(transactionId, { size: 32 });

      console.log(`📖 Reading transaction from Data Streams: ${transactionId}`);

      // Read from Data Streams
      const data = await this.sdk.streams.getByKey(
        this.schemaId,
        publisherAddress,
        dataKey
      );

      if (!data) {
        console.log(`ℹ️ No data found for transaction: ${transactionId}`);
        return null;
      }

      // Decode the data
      const decoded = this.schemaEncoder.decode(data);

      console.log(`✅ Transaction read from Data Streams: ${transactionId}`);

      // Map to TransactionData interface
      return {
        timestamp: BigInt(decoded[0]),
        transactionId: decoded[1],
        userWallet: decoded[2],
        calendarId: decoded[3],
        eventId: decoded[4],
        transactionType: decoded[5] as TransactionType,
        fromToken: decoded[6],
        toToken: decoded[7],
        amount: BigInt(decoded[8]),
        amountReceived: BigInt(decoded[9]),
        txHash: decoded[10],
        status: decoded[11] as TransactionStatus,
        notes: decoded[12],
      };
    } catch (error) {
      console.error('❌ Error reading from Data Streams:', error);
      return null;
    }
  }

  /**
   * Get all transactions for a publisher
   */
  async getAllTransactions(publisherAddress: string): Promise<TransactionData[]> {
    try {
      // Ensure schema ID is computed
      if (!this.schemaId) {
        await this.initialize();
      }

      console.log(`📚 Getting all transactions for publisher: ${publisherAddress}`);

      // Get all data for schema and publisher
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(
        this.schemaId,
        publisherAddress
      );

      if (!allData || allData.length === 0) {
        console.log(`ℹ️ No transactions found for publisher: ${publisherAddress}`);
        return [];
      }

      // Decode all records
      const transactions: TransactionData[] = allData.map((record: any) => {
        const decoded = this.schemaEncoder.decode(record.data);
        
        return {
          timestamp: BigInt(decoded[0]),
          transactionId: decoded[1],
          userWallet: decoded[2],
          calendarId: decoded[3],
          eventId: decoded[4],
          transactionType: decoded[5] as TransactionType,
          fromToken: decoded[6],
          toToken: decoded[7],
          amount: BigInt(decoded[8]),
          amountReceived: BigInt(decoded[9]),
          txHash: decoded[10],
          status: decoded[11] as TransactionStatus,
          notes: decoded[12],
        };
      });

      console.log(`✅ Found ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting all transactions:', error);
      return [];
    }
  }

  /**
   * Get schema ID
   */
  getSchemaId(): string {
    return this.schemaId;
  }

  /**
   * Get publisher address
   */
  getPublisherAddress(): string {
    return this.publisherAddress;
  }

  /**
   * Create a transaction record helper
   */
  createTransactionRecord(
    calendarId: string,
    eventId: string,
    userWallet: string,
    fromToken: string,
    toToken: string,
    amount: bigint,
    amountReceived: bigint = BigInt(0),
    txHash: string = '',
    status: TransactionStatus = TransactionStatus.PENDING,
    notes: string = ''
  ): TransactionData {
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const transactionId = createTransactionId(calendarId, eventId, Number(timestamp));

    return {
      timestamp,
      transactionId,
      userWallet,
      calendarId,
      eventId,
      transactionType: TransactionType.SWAP,
      fromToken,
      toToken,
      amount,
      amountReceived,
      txHash,
      status,
      notes,
    };
  }
}

export default DataStreamsService;

