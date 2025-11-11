# 🌟 Chunk 0: Somnia Data Streams - Hello World

**Read this first!** Before building Tempora, let's understand how Somnia Data Streams works with a simple "Hello World" example. This 10-minute tutorial will give you hands-on experience with the core technology.

## 🎯 What You'll Learn

- How to define schemas for structured data
- How to publish data on-chain
- How to subscribe and read data in real-time
- The foundation for building Tempora

## 📋 Prerequisites

- Node.js 18+ installed
- A Somnia testnet wallet with STT tokens
- 10 minutes of your time

## 🔑 Key Concepts

Before we code, understand these three concepts:

### 1. Schemas
Schemas define your data structure, like a database table:

```javascript
// Example schema
"string message, uint256 timestamp, address sender"
```

### 2. Schema ID
A unique identifier computed from the schema:

```javascript
const schemaId = await sdk.streams.computeSchemaId(schema);
// Returns: 0x27c30fa6547c34518f2de6a268b29ac3b54e51c98f8d0ef6018bbec9153e9742
```

### 3. Publishers
The wallet address that owns and writes the data. Only the publisher can update their data.

## 🚀 Quick Start Project

### Step 1: Create Project

```bash
mkdir hello-somnia
cd hello-somnia
npm init -y
npm install @somnia-chain/streams viem dotenv
```

### Step 2: Create Environment File

Create `.env`:

```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
PUBLIC_KEY=0xYOUR_PUBLIC_ADDRESS
```

**Get Test Tokens:**
1. Visit: https://faucet.somnia.network
2. Paste your PUBLIC_KEY
3. Request tokens

### Step 3: Network Configuration

Create `dream-chain.js`:

```javascript
const { defineChain } = require("viem");

const dreamChain = defineChain({
  id: 50312,
  name: "Somnia Dream",
  network: "somnia-dream",
  nativeCurrency: { 
    name: "STT", 
    symbol: "STT", 
    decimals: 18 
  },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
});

module.exports = { dreamChain };
```

### Step 4: Create Publisher

Create `publisher.js`:

```javascript
const { SDK, SchemaEncoder, zeroBytes32 } = require("@somnia-chain/streams");
const { createPublicClient, http, createWalletClient, toHex } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { waitForTransactionReceipt } = require("viem/actions");
const { dreamChain } = require("./dream-chain");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Somnia Data Streams Publisher...\n");

  // Initialize clients
  const publicClient = createPublicClient({ 
    chain: dreamChain, 
    transport: http() 
  });
  
  const walletClient = createWalletClient({
    account: privateKeyToAccount(process.env.PRIVATE_KEY),
    chain: dreamChain,
    transport: http(),
  });

  console.log(`📍 Publisher Address: ${walletClient.account.address}\n`);

  // Initialize SDK
  const sdk = new SDK({ public: publicClient, wallet: walletClient });

  // 1️⃣ Define Schema
  const helloSchema = `string message, uint256 timestamp, address sender`;
  const schemaId = await sdk.streams.computeSchemaId(helloSchema);
  console.log(`📊 Schema ID: ${schemaId}\n`);

  // 2️⃣ Register Schema (with error handling)
  const ignoreAlreadyRegistered = true;

  try {
    const txHash = await sdk.streams.registerDataSchemas(
      [
        {
          id: 'hello_world',
          schema: helloSchema,
          parentSchemaId: zeroBytes32
        },
      ],
      ignoreAlreadyRegistered
    );

    if (txHash) {
      await waitForTransactionReceipt(publicClient, { hash: txHash });
      console.log(`✅ Schema registered! Tx: ${txHash}\n`);
    } else {
      console.log('ℹ️  Schema already registered — ready to publish!\n');
    }
  } catch (err) {
    if (String(err).includes('SchemaAlreadyRegistered')) {
      console.log('⚠️  Schema already registered. Continuing...\n');
    } else {
      throw err;
    }
  }

  // 3️⃣ Publish Messages Every 3 Seconds
  const encoder = new SchemaEncoder(helloSchema);
  let count = 0;

  console.log("📡 Publishing messages every 3 seconds...\n");

  setInterval(async () => {
    count++;
    
    // Encode data according to schema
    const data = encoder.encodeData([
      { name: 'message', value: `Hello World #${count}`, type: 'string' },
      { name: 'timestamp', value: BigInt(Math.floor(Date.now() / 1000)), type: 'uint256' },
      { name: 'sender', value: walletClient.account.address, type: 'address' },
    ]);

    // Publish to blockchain
    const dataStreams = [
      { 
        id: toHex(`hello-${count}`, { size: 32 }), 
        schemaId, 
        data 
      }
    ];
    
    const tx = await sdk.streams.set(dataStreams);
    console.log(`✅ Published: Hello World #${count}`);
    console.log(`   Tx: ${tx}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
  }, 3000);
}

main().catch(console.error);
```

### Step 5: Create Subscriber

Create `subscriber.js`:

```javascript
const { SDK, SchemaEncoder } = require("@somnia-chain/streams");
const { createPublicClient, http } = require("viem");
const { dreamChain } = require("./dream-chain");
require('dotenv').config();

async function main() {
  console.log("👂 Starting Somnia Data Streams Subscriber...\n");

  // Use the publisher's wallet address from .env
  const publisherWallet = process.env.PUBLIC_KEY;
  console.log(`📍 Listening to: ${publisherWallet}\n`);

  // Initialize public client (read-only)
  const publicClient = createPublicClient({ 
    chain: dreamChain, 
    transport: http() 
  });

  // Initialize SDK (no wallet needed for reading)
  const sdk = new SDK({ public: publicClient });

  // Compute the same schema ID
  const helloSchema = `string message, uint256 timestamp, address sender`;
  const schemaId = await sdk.streams.computeSchemaId(helloSchema);
  console.log(`📊 Schema ID: ${schemaId}\n`);

  const schemaEncoder = new SchemaEncoder(helloSchema);
  const seen = new Set();

  console.log("🔍 Polling for new messages every 3 seconds...\n");

  // Poll every 3 seconds
  setInterval(async () => {
    try {
      // Get all data for this schema from this publisher
      const allData = await sdk.streams.getAllPublisherDataForSchema(
        schemaId, 
        publisherWallet
      );

      // Decode and display new messages
      for (const dataItem of allData) {
        let message = "", timestamp = "", sender = "";

        // Extract fields
        for (const field of dataItem) {
          const val = field.value?.value ?? field.value;
          if (field.name === "message") message = val;
          if (field.name === "timestamp") timestamp = val.toString();
          if (field.name === "sender") sender = val;
        }

        // Check if we've seen this message before
        const id = `${timestamp}-${message}`;
        if (!seen.has(id)) {
          seen.add(id);
          const date = new Date(Number(timestamp) * 1000);
          console.log(`🆕 ${message}`);
          console.log(`   From: ${sender}`);
          console.log(`   Time: ${date.toLocaleTimeString()}\n`);
        }
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  }, 3000);
}

main().catch(console.error);
```

### Step 6: Update package.json

Add scripts to `package.json`:

```json
{
  "name": "hello-somnia",
  "version": "1.0.0",
  "scripts": {
    "publisher": "node publisher.js",
    "subscriber": "node subscriber.js"
  },
  "dependencies": {
    "@somnia-chain/streams": "^1.0.0",
    "viem": "^2.7.0",
    "dotenv": "^16.0.0"
  }
}
```

## 🧪 Run the Example

Open **two terminal windows**.

**Terminal 1 - Publisher:**
```bash
npm run publisher
```

You'll see:
```
🚀 Starting Somnia Data Streams Publisher...

📍 Publisher Address: 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03

📊 Schema ID: 0x27c30fa6547c34518f2de6a268b29ac3b54e51c98f8d0ef6018bbec9153e9742

ℹ️  Schema already registered — ready to publish!

📡 Publishing messages every 3 seconds...

✅ Published: Hello World #1
   Tx: 0xf21ad71a6c7aa54c171ad38b79ef417e8488fd750ce00c1357918b7c7fa5c951
   Time: 2:24:04 PM

✅ Published: Hello World #2
   Tx: 0xe999b0381ba9d937d85eb558fefe214fa4e572767c4e698c6e31588ff0e68f0a
   Time: 2:24:07 PM
```

**Terminal 2 - Subscriber:**
```bash
npm run subscriber
```

You'll see:
```
👂 Starting Somnia Data Streams Subscriber...

📍 Listening to: 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03

📊 Schema ID: 0x27c30fa6547c34518f2de6a268b29ac3b54e51c98f8d0ef6018bbec9153e9742

🔍 Polling for new messages every 3 seconds...

🆕 Hello World #1
   From: 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03
   Time: 2:24:04 PM

🆕 Hello World #2
   From: 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03
   Time: 2:24:07 PM

🆕 Hello World #3
   From: 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03
   Time: 2:24:10 PM
```

## 🎉 Congratulations!

You've just:
- ✅ Defined a data schema
- ✅ Registered it on Somnia blockchain
- ✅ Published structured data on-chain
- ✅ Read that data in real-time
- ✅ Built a working publish/subscribe system!

## 🔍 Understanding What Just Happened

### Publisher Side
1. **Schema Definition**: Defined data structure (message, timestamp, sender)
2. **Schema Registration**: Registered schema on-chain (one-time operation)
3. **Data Encoding**: Converted JavaScript objects to blockchain-compatible format
4. **Publishing**: Wrote data on-chain with `sdk.streams.set()`
5. **Verification**: Each message got a transaction hash

### Subscriber Side
1. **Schema Matching**: Used same schema ID to decode data
2. **Polling**: Checked blockchain every 3 seconds for new data
3. **Decoding**: Converted blockchain data back to JavaScript objects
4. **Display**: Showed new messages in real-time

## 🧠 Key Insights for Epochi

This Hello World example demonstrates the core technology that powers Epochi:

| Hello World | Epochi Equivalent |
|-------------|-------------------|
| `string message` | Transaction details |
| Publisher address | Service wallet |
| Schema ID | Transaction schema |
| `sdk.streams.set()` | Recording swaps |
| Subscriber polling | Dashboard updates |

## 📊 Data Flow Comparison

**Hello World:**
```
Publisher → Schema → Encode → Blockchain → Decode → Subscriber
```

**Epochi:**
```
Calendar Event → Transaction → Execute → Data Streams → Dashboard
```

## 🔐 Important Concepts

### 1. Immutability
Once published, data cannot be deleted. You can only add new records.

### 2. Publisher Ownership
Only your wallet can publish under your address. No one can fake data from you.

### 3. Public Readability
Anyone can read data if they know:
- Schema ID
- Publisher address
- Data ID (optional)

### 4. Gas Costs
Each `set()` operation costs gas (very cheap on Somnia):
- Schema registration: ~0.001 STT
- Publishing data: ~0.0001 STT per record

## 🚀 Next Steps

Now that you understand Data Streams, you're ready to build Epochi!

**Continue to:** [Chunk 1: Project Setup →](01-project-setup.md)

In Epochi, you'll use these same concepts to:
- Store transaction records instead of "Hello World"
- Link transactions to calendar events
- Build a real-time dashboard
- Create production-ready DeFi automation

## 🐛 Troubleshooting

### Error: "Insufficient funds"
```bash
# Get testnet tokens
Visit: https://faucet.somnia.network
```

### Error: "Invalid private key"
```bash
# Ensure your .env has the correct format
PRIVATE_KEY=0x1234567890abcdef... (with 0x prefix)
```

### Subscriber sees no messages
```bash
# Ensure PUBLIC_KEY matches your publisher wallet
# Wait 3-6 seconds for polling to occur
```

### Schema already registered error
```bash
# This is normal! The code handles it automatically
# Your schema persists on-chain
```

## 📚 Additional Resources

- **Somnia Docs**: https://docs.somnia.network
- **Data Streams SDK**: https://www.npmjs.com/package/@somnia-chain/streams
- **Viem Documentation**: https://viem.sh
- **Somnia Explorer**: https://somnia.explorer.caldera.xyz

## 💡 Challenge Yourself

Before moving to Chunk 1, try modifying this example:

1. **Add more fields** to the schema (e.g., `uint256 counter`)
2. **Change publishing frequency** (every 10 seconds)
3. **Add filtering** to subscriber (only show messages with certain text)
4. **Create multiple publishers** and subscribers

---

**Ready to build Epochi?** Start with [Chunk 1: Project Setup →](01-project-setup.md)

This Hello World example is the foundation. Epochi takes these concepts and builds a complete DeFi automation system on top!

