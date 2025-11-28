# 🏆 Epochi - Somnia Data Streams Hackathon Submission

> **Calendar-Powered DeFi Automation with On-Chain Data Streams**

---

## 🎯 Project Overview

**Epochi** transforms Google Calendar into a DeFi automation platform on Somnia Network. Users schedule transactions as calendar events, and the platform automatically executes them at the specified time.

**What makes this unique?** We leverage **Somnia Data Streams** to create a transparent, verifiable, and reputation-based transaction ecosystem.

---

## 📊 Data Streams Integration - 4 Key Use Cases

### 1️⃣ Transaction Audit Trail

**Problem:** Traditional DeFi lacks immutable, structured transaction history that's easy to query and verify.

**Solution:** Every executed transaction is recorded to Data Streams with full context:

```typescript
// Schema: TRANSACTION_SCHEMA
{
  timestamp: uint64,
  transactionId: bytes32,
  userWallet: address,
  calendarId: string,
  eventId: string,
  transactionType: string,  // swap, transfer, stake
  fromToken: string,
  toToken: string,
  amount: uint256,
  amountReceived: uint256,
  txHash: bytes32,
  status: string,           // pending, executed, failed
  notes: string
}
```

**Benefits:**
- ✅ Immutable on-chain record of all transactions
- ✅ Links blockchain tx to calendar event for context
- ✅ Queryable by user, time, or transaction type
- ✅ Perfect for compliance and auditing

**API Endpoint:**
```bash
POST /api/streams/transaction
GET /api/streams/transactions/:publisherAddress
```

---

### 2️⃣ Scheduled Intent Registry

**Problem:** Users can claim they "planned" to execute transactions at specific times, but there's no way to prove it.

**Solution:** Pre-announce transaction intents BEFORE execution:

```typescript
// Schema: SCHEDULED_INTENT_SCHEMA
{
  scheduledTime: uint64,    // When transaction SHOULD execute
  intentId: bytes32,
  userWallet: address,
  transactionType: string,
  fromToken: string,
  toToken: string,
  amount: uint256,
  description: string,
  createdAt: uint64,
  status: string           // scheduled, executing, completed
}
```

**Benefits:**
- ✅ **Transparency:** Anyone can see upcoming scheduled transactions
- ✅ **Accountability:** Users commit to actions before execution
- ✅ **MEV Protection:** No false claims about "scheduled" trades
- ✅ **Trust Building:** Public commitment creates accountability

**API Endpoint:**
```bash
POST /api/data-streams/intent
GET /api/data-streams/intent/:intentId
```

**Example Flow:**
1. User creates calendar event "Swap 100 USDC to ETH at 3pm"
2. System immediately writes **Intent** to Data Streams
3. At 3pm, transaction executes
4. Intent status updates to "completed"

---

### 3️⃣ User Reputation System

**Problem:** DeFi has no portable, on-chain reputation system based on actual behavior.

**Solution:** Track user activity metrics on Data Streams:

```typescript
// Schema: USER_STATS_SCHEMA
{
  userWallet: address,
  totalTransactions: uint64,
  successfulTransactions: uint64,
  failedTransactions: uint64,
  totalVolume: uint256,
  firstActivityAt: uint64,
  lastActivityAt: uint64,
  mostUsedAction: string
}
```

**Reputation Tiers:**
| Tier | Criteria |
|------|----------|
| 🌱 Newcomer | < 5 transactions |
| ⭐ Rising Star | < 20 tx, > 80% success |
| 🔥 Active Trader | < 50 tx, > 90% success |
| 💎 Diamond Hands | 50+ tx, > 95% success |

**Benefits:**
- ✅ **Portable Reputation:** Follows users across applications
- ✅ **Trust Verification:** Other protocols can check user history
- ✅ **Decentralized:** No centralized database needed
- ✅ **Incentives:** Good behavior builds reputation

**API Endpoint:**
```bash
GET /api/data-streams/stats/:userWallet
```

---

### 4️⃣ Execution Proofs

**Problem:** No way to cryptographically prove a transaction executed at the scheduled time.

**Solution:** Create verifiable proofs linking intent to execution:

```typescript
// Schema: EXECUTION_PROOF_SCHEMA
{
  proofId: bytes32,
  intentId: bytes32,          // Links to scheduled intent
  txHash: bytes32,            // Actual transaction hash
  scheduledTime: uint64,      // When it SHOULD have executed
  actualExecutionTime: uint64, // When it ACTUALLY executed
  timeDelta: int64,           // Difference (can be negative)
  executionStatus: string,    // success, failed, partial
  expectedAmount: uint256,
  actualAmount: uint256,
  verificationHash: string    // SHA256(intentId + txHash + amount)
}
```

**Benefits:**
- ✅ **Verification:** Third parties can verify execution matched schedule
- ✅ **Compliance:** Audit trail for regulatory requirements
- ✅ **SLA Tracking:** Measure execution timing accuracy
- ✅ **Dispute Resolution:** Immutable proof of what happened

**API Endpoint:**
```bash
GET /api/data-streams/proof/:proofId
```

---

## 🔄 Complete Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google         │     │  Epochi          │     │  Somnia         │
│  Calendar       │────▶│  Backend         │────▶│  Data Streams   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                        │                        │
       │  1. Create Event       │                        │
       │  "Swap 1 ETH to USDC   │                        │
       │   at 3pm"              │                        │
       │                        │                        │
       │                        │  2. Write INTENT       │
       │                        │─────────────────────▶ │
       │                        │                        │
       │                        │  (wait for 3pm...)     │
       │                        │                        │
       │                        │  3. Execute TX         │
       │                        │─────────────────────▶ │
       │                        │                        │
       │                        │  4. Write TRANSACTION  │
       │                        │─────────────────────▶ │
       │                        │                        │
       │                        │  5. Update USER_STATS  │
       │                        │─────────────────────▶ │
       │                        │                        │
       │                        │  6. Create PROOF       │
       │                        │─────────────────────▶ │
       │                        │                        │
       │  7. Update Event       │                        │
       │◀────────────────────── │                        │
       │  "✅ Executed!"        │                        │
```

---

## 🚀 Try It Yourself

### Demo Endpoint

Run a complete demonstration of all Data Streams use cases:

```bash
curl -X POST http://localhost:3001/api/data-streams/demo
```

This will:
1. Announce a scheduled intent
2. Record a transaction
3. Update user statistics
4. Create an execution proof

### Individual API Calls

```bash
# Get Data Streams info and schemas
curl http://localhost:3001/api/data-streams/info

# Announce an intent
curl -X POST http://localhost:3001/api/data-streams/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userWallet": "0x123...",
    "scheduledTime": 1703000000,
    "transactionType": "swap",
    "fromToken": "ETH",
    "toToken": "USDC",
    "amount": "1.0",
    "description": "Weekly DCA swap"
  }'

# Get user reputation
curl http://localhost:3001/api/data-streams/stats/0x123...

# Verify execution proof
curl http://localhost:3001/api/data-streams/proof/proof-123...
```

---

## 💡 Why Data Streams?

| Feature | Traditional Database | Somnia Data Streams |
|---------|---------------------|---------------------|
| Immutability | ❌ Can be modified | ✅ Permanent |
| Decentralization | ❌ Single point | ✅ On-chain |
| Verification | ❌ Trust required | ✅ Cryptographic |
| Portability | ❌ Siloed | ✅ Universal |
| Schema Enforcement | ❌ Optional | ✅ Built-in |

---

## 📁 Code Structure

```
backend/src/
├── schemas/
│   ├── transaction.schema.ts       # Audit trail schema
│   ├── scheduled-intent.schema.ts  # Intent registry schema
│   ├── user-stats.schema.ts        # Reputation schema
│   └── execution-proof.schema.ts   # Proof schema
│
├── services/blockchain/
│   ├── DataStreamsService.ts       # Basic implementation
│   └── EnhancedDataStreamsService.ts # Full 4-schema implementation
│
└── routes/
    ├── streams.routes.ts           # Basic API
    └── data-streams.routes.ts      # Enhanced API with all use cases
```

---

## 🏗️ Technical Implementation

### Schema Encoding

```typescript
// Using Somnia's SchemaEncoder
const encoder = new SchemaEncoder(SCHEDULED_INTENT_SCHEMA);

const encodedData = encoder.encodeData([
  { name: 'scheduledTime', value: '1703000000', type: 'uint64' },
  { name: 'intentId', value: '0x...', type: 'bytes32' },
  // ... more fields
]);

// Write to Data Streams
await sdk.streams.set([{
  id: intentIdBytes32,
  schemaId: computedSchemaId,
  data: encodedData
}]);
```

### Reading and Verifying

```typescript
// Read from Data Streams
const data = await sdk.streams.getByKey(
  schemaId,
  publisherAddress,
  dataKey
);

// Decode
const decoded = encoder.decode(data);
```

---

## 🎥 Demo Video

[Link to demo video showing the complete flow]

---

## 👥 Team

- **Harshal Bhangale** - Full Stack Developer

---

## 🔗 Links

- **GitHub:** https://github.com/harshalbhangale/Epochi
- **Live Demo:** [Coming Soon]
- **Somnia Network:** https://somnia.network

---

## 📄 License

MIT License

---

**Built with ❤️ for the Somnia Data Streams Mini Hackathon**

