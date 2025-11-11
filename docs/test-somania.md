# “Hello World” App

If you’ve ever wanted to see your data travel onchain in real time, this is the simplest way to begin. In this guide, we’ll build and run a Hello World Publisher and Subscriber using the Somnia Data Streams SDK. It demonstrates how to define a schema, publish onchain data, and read it in real time.

Somnia Data Streams enables developers to store, retrieve, and react to real-time blockchain data without needing to build indexers or manually poll the chain.

Each app works around three key ideas:

1. Schemas – define the data format.
2. Data IDs – uniquely identify each record.
3. Publishers – wallet addresses that own and post data.

Your app can write (“publish”) data using one account, and another app (or user) can “subscribe” to read or monitor that data stream. This “Hello World” project demonstrates exactly how that works.

## Prerequisites

Before you begin:

* Node.js 18+ installed
* A Somnia Testnet wallet with STT test tokens
* `.env` file containing your wallet credentials:

## Project Setup

Create a Project Directory and install dependencies [@somnia-chain/streams](https://www.npmjs.com/package/@somnia-chain/streams) and [viem](https://viem.sh/):

```bash
npm init -y
npm install @somnia-chain/streams viem dotenv
```

Now create a .env file to hold your test wallet’s private key:

```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
PUBLIC_KEY=0xYOUR_PUBLIC_ADDRESS
```

## Project Overview

The project contains four files:

| File           | Description                                         |
| -------------- | --------------------------------------------------- |
| publisher.js   | Sends “Hello World” messages to Somnia Data Streams |
| subscriber.js  | Reads and displays those messages                   |
| dream-chain.js | Configures the Somnia Dream testnet connection      |
| package.json   | Handles dependencies and npm scripts                |

## Network Configuration

The file `dream-chain.js` defines the blockchain network connection.

```javascript
const { defineChain } = require("viem");
const dreamChain = defineChain({
  id: 50312,
  name: "Somnia Dream",
  network: "somnia-dream",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
});

module.exports = { dreamChain };

```

This allows both publisher and subscriber scripts to easily reference the same testnet environment.

## Hello World Publisher

The publisher connects to the blockchain, registers a schema if necessary, and sends a “Hello World” message every few seconds.

```javascript
const { SDK, SchemaEncoder, zeroBytes32 } = require("@somnia-chain/streams")
const { createPublicClient, http, createWalletClient, toHex } = require("viem")
const { privateKeyToAccount } = require("viem/accounts")
const { waitForTransactionReceipt } = require("viem/actions")
const { dreamChain } = require("./dream-chain")
require("dotenv").config()

async function main() {
  const publicClient = createPublicClient({ chain: dreamChain, transport: http() })
  const walletClient = createWalletClient({
    account: privateKeyToAccount(process.env.PRIVATE_KEY),
    chain: dreamChain,
    transport: http(),
  })

  const sdk = new SDK({ public: publicClient, wallet: walletClient })

  // 1️⃣ Define schema
  const helloSchema = `string message, uint256 timestamp, address sender`
  const schemaId = await sdk.streams.computeSchemaId(helloSchema)
  console.log("Schema ID:", schemaId)

  // 2️⃣ Safer schema registration
  const ignoreAlreadyRegistered = true

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
    )

    if (txHash) {
      await waitForTransactionReceipt(publicClient, { hash: txHash })
      console.log(`✅ Schema registered or confirmed, Tx: ${txHash}`)
    } else {
      console.log('ℹ️ Schema already registered — no action required.')
    }
  } catch (err) {
    // fallback: if the SDK doesn’t support the flag yet
    if (String(err).includes('SchemaAlreadyRegistered')) {
      console.log('⚠️ Schema already registered. Continuing...')
    } else {
      throw err
    }
  }

  // 3️⃣ Publish messages
  const encoder = new SchemaEncoder(helloSchema)
  let count = 0

  setInterval(async () => {
    count++
    const data = encoder.encodeData([
      { name: 'message', value: `Hello World #${count}`, type: 'string' },
      { name: 'timestamp', value: BigInt(Math.floor(Date.now() / 1000)), type: 'uint256' },
      { name: 'sender', value: walletClient.account.address, type: 'address' },
    ])

    const dataStreams = [{ id: toHex(`hello-${count}`, { size: 32 }), schemaId, data }]
    const tx = await sdk.streams.set(dataStreams)
    console.log(`✅ Published: Hello World #${count} (Tx: ${tx})`)
  }, 3000)
}

main()

```

This function connects to Somnia Dream Testnet using your wallet and computes the schema ID for the message structure. It then registers the schema if not already registered.\
The \`encodeData\` method encodes each message as a structured data packet, and it then publishes data to the chain using sdk.streams.set().

Each transaction is a verifiable, timestamped on-chain record.

***

## Hello World Subscriber

The subscriber listens for any messages published under the same schema and publisher address.\
It uses a simple polling mechanism, executed every 3 seconds, to fetch and decode updates.

```javascript
const { SDK, SchemaEncoder } = require("@somnia-chain/streams");
const { createPublicClient, http } = require("viem");
const { dreamChain } = require("./dream-chain");
require('dotenv').config();

async function main() {
  const publisherWallet = process.env.PUBLISHER_WALLET;
  const publicClient = createPublicClient({ chain: dreamChain, transport: http() });
  const sdk = new SDK({ public: publicClient });

  const helloSchema = `string message, uint256 timestamp, address sender`;
  const schemaId = await sdk.streams.computeSchemaId(helloSchema);

  const schemaEncoder = new SchemaEncoder(helloSchema);
  const seen = new Set();

  setInterval(async () => {
    const allData = await sdk.streams.getAllPublisherDataForSchema(schemaId, publisherWallet);
    for (const dataItem of allData) {
      let message = "", timestamp = "", sender = "";
      for (const field of dataItem) {
        const val = field.value?.value ?? field.value;
        if (field.name === "message") message = val;
        if (field.name === "timestamp") timestamp = val.toString();
        if (field.name === "sender") sender = val;
      }

      const id = `${timestamp}-${message}`;
      if (!seen.has(id)) {
        seen.add(id);
        console.log(`🆕 ${message} from ${sender} at ${new Date(Number(timestamp) * 1000).toLocaleTimeString()}`);
      }
    }
  }, 3000);
}

main();
```

This function computes the same Schema ID used by the publisher. It polls the blockchain for all messages from that publisher and decodes data according to the schema fields. Then, it displays any new messages with timestamps and sender addresses.

***

## Run the App

Run both scripts in separate terminals:

```bash
npm run publisher
```

and then

```bash
npm run subscriber
```

You’ll see Publisher Output:

```bash
Schema ID: 0x27c30fa6547c34518f2de6a268b29ac3b54e51c98f8d0ef6018bbec9153e9742
⚠️ Schema already registered. Continuing...
✅ Published: Hello World #1 (Tx: 0xf21ad71a6c7aa54c171ad38b79ef417e8488fd750ce00c1357918b7c7fa5c951)
✅ Published: Hello World #2 (Tx: 0xe999b0381ba9d937d85eb558fefe214fa4e572767c4e698c6e31588ff0e68f0a)
```

Subscriber Output

```bash
🆕 Hello World #2 from 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03 at 2:24:04 PM
🆕 Hello World #3 from 0xb6e4fa6ff2873480590c68D9Aa991e5BB14Dbf03 at 2:24:07 PM
```

Congratulations 🎉 You’ve just published and read blockchain data using Somnia Data Streams!

This is the foundation for real-time decentralized apps, chat apps, dashboards, IoT feeds, leaderboards, and more.

***

## Conclusion

You’ve just learned how to:

* Define and compute a schema and schema ID
* Register it on the Somnia Testnet
* Publish and subscribe to on-chain structured data
* Decode and render blockchain messages in real time

This simple 'Hello World' app is your first step toward building real-time, decentralized applications on Somnia.

\\
