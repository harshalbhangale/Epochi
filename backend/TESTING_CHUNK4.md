# Testing Chunk 4: Somnia Data Streams Integration

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Schema endpoint returns schema information
- [ ] Publisher address endpoint works
- [ ] Can write transaction to Data Streams
- [ ] Can read transaction from Data Streams
- [ ] Can get all transactions for a publisher
- [ ] Data is properly encoded/decoded

---

## Step-by-Step Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Data Streams Service initialized
📍 Publisher address: 0x1234...
🔑 Schema ID: 0xabcd...
🚀 Epochi backend running on port 3001
```

---

### 2. Get Schema Information

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/streams/schema
```

**Expected Response:**
```json
{
  "success": true,
  "schemaId": "0xabcd...",
  "publisherAddress": "0x1234...",
  "schema": {
    "fields": [
      "timestamp (uint64)",
      "transactionId (bytes32)",
      "userWallet (address)",
      "calendarId (string)",
      "eventId (string)",
      "transactionType (string)",
      "fromToken (string)",
      "toToken (string)",
      "amount (uint256)",
      "amountReceived (uint256)",
      "txHash (bytes32)",
      "status (string)",
      "notes (string)"
    ]
  }
}
```

✅ **Save the `publisherAddress` - you'll need it for reading transactions!**

---

### 3. Get Publisher Address

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/streams/publisher
```

**Expected Response:**
```json
{
  "success": true,
  "publisherAddress": "0x1234..."
}
```

---

### 4. Write a Transaction to Data Streams

**Using PowerShell:**
```powershell
$transaction = @{
    calendarId = "primary"
    eventId = "test-event-123"
    userWallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    fromToken = "STT"
    toToken = "USDC"
    amount = "1000000000000000000"  # 1 token (18 decimals)
    amountReceived = "0"
    txHash = ""
    status = "pending"
    notes = "Test transaction from Epochi"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/streams/transaction `
  -Method POST `
  -ContentType "application/json" `
  -Body $transaction
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Transaction written to Data Streams",
  "transactionId": "primary-test-event-123-1234567890",
  "streamTxHash": "0xabc123...",
  "explorerUrl": "https://somnia.explorer.caldera.xyz/tx/0xabc123..."
}
```

✅ **Save the `transactionId` and `streamTxHash` for the next steps!**

**Note:** This will submit a transaction to the blockchain, so you need:
- Publisher wallet to have STT tokens (for gas)
- Wait a few seconds for transaction confirmation

---

### 5. Read Transaction from Data Streams

**Using PowerShell:**
```powershell
# Replace with your actual transactionId and publisherAddress
$transactionId = "primary-test-event-123-1234567890"
$publisherAddress = "0x1234..."  # From step 2

Invoke-RestMethod -Uri "http://localhost:3001/api/streams/transaction/$transactionId?publisherAddress=$publisherAddress"
```

**Expected Response:**
```json
{
  "success": true,
  "transaction": {
    "timestamp": "1234567890",
    "transactionId": "primary-test-event-123-1234567890",
    "userWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "calendarId": "primary",
    "eventId": "test-event-123",
    "transactionType": "swap",
    "fromToken": "STT",
    "toToken": "USDC",
    "amount": "1000000000000000000",
    "amountReceived": "0",
    "txHash": "",
    "status": "pending",
    "notes": "Test transaction from Epochi"
  }
}
```

✅ **If you see the transaction data, reading is working!**

---

### 6. Get All Transactions for Publisher

**Using PowerShell:**
```powershell
# Replace with your publisherAddress from step 2
$publisherAddress = "0x1234..."

Invoke-RestMethod -Uri "http://localhost:3001/api/streams/transactions/$publisherAddress"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "transactions": [
    {
      "timestamp": "1234567890",
      "transactionId": "primary-test-event-123-1234567890",
      "userWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "calendarId": "primary",
      "eventId": "test-event-123",
      "transactionType": "swap",
      "fromToken": "STT",
      "toToken": "USDC",
      "amount": "1000000000000000000",
      "amountReceived": "0",
      "txHash": "",
      "status": "pending",
      "notes": "Test transaction from Epochi"
    }
  ]
}
```

✅ **If you see all transactions, the service is working!**

---

## Quick Test Script

Save this as `test-streams.ps1`:

```powershell
# Test Data Streams Integration
Write-Host "Testing Epochi Data Streams..." -ForegroundColor Cyan

# 1. Get schema info
Write-Host "`n1. Getting schema information..." -ForegroundColor Yellow
try {
    $schema = Invoke-RestMethod -Uri "http://localhost:3001/api/streams/schema"
    Write-Host "✅ Schema ID: $($schema.schemaId)" -ForegroundColor Green
    Write-Host "   Publisher: $($schema.publisherAddress)" -ForegroundColor Gray
    $publisherAddress = $schema.publisherAddress
} catch {
    Write-Host "❌ Failed to get schema" -ForegroundColor Red
    exit
}

# 2. Write transaction
Write-Host "`n2. Writing test transaction..." -ForegroundColor Yellow
$testTx = @{
    calendarId = "primary"
    eventId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    userWallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    fromToken = "STT"
    toToken = "USDC"
    amount = "1000000000000000000"
    status = "pending"
    notes = "Automated test from Epochi"
}

try {
    $written = Invoke-RestMethod -Uri "http://localhost:3001/api/streams/transaction" `
        -Method POST `
        -ContentType "application/json" `
        -Body ($testTx | ConvertTo-Json)
    Write-Host "✅ Transaction written: $($written.transactionId)" -ForegroundColor Green
    Write-Host "   TX Hash: $($written.streamTxHash)" -ForegroundColor Gray
    $transactionId = $written.transactionId
    
    # Wait for confirmation
    Write-Host "   Waiting for confirmation..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
} catch {
    Write-Host "❌ Failed to write transaction: $_" -ForegroundColor Red
    exit
}

# 3. Read transaction
Write-Host "`n3. Reading transaction back..." -ForegroundColor Yellow
try {
    $read = Invoke-RestMethod -Uri "http://localhost:3001/api/streams/transaction/$transactionId?publisherAddress=$publisherAddress"
    Write-Host "✅ Transaction read successfully" -ForegroundColor Green
    Write-Host "   Calendar ID: $($read.transaction.calendarId)" -ForegroundColor Gray
    Write-Host "   Amount: $($read.transaction.amount)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Failed to read transaction (may need to wait longer)" -ForegroundColor Yellow
}

# 4. Get all transactions
Write-Host "`n4. Getting all transactions..." -ForegroundColor Yellow
try {
    $all = Invoke-RestMethod -Uri "http://localhost:3001/api/streams/transactions/$publisherAddress"
    Write-Host "✅ Found $($all.count) transactions" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get all transactions" -ForegroundColor Red
}

Write-Host "`n🎉 Data Streams tests completed!" -ForegroundColor Green
```

Run with:
```powershell
.\test-streams.ps1
```

---

## Troubleshooting

### Server won't start
- Check `.env` file has `SOMNIA_RPC_URL` set
- Verify `ENCRYPTION_KEY` is set (used for service key generation)
- Check for TypeScript compilation errors
- Verify `@somnia-chain/streams` package is installed

### Schema initialization fails
- Check network connection to Somnia RPC
- Verify RPC URL is correct: `https://dream-rpc.somnia.network`
- Check server logs for detailed errors

### Writing transaction fails
- **Most common:** Publisher wallet needs STT tokens for gas
  - Get publisher address: `GET /api/streams/publisher`
  - Request faucet funds for that address: https://faucet.somnia.network
- Verify all required fields are provided
- Check transaction data format (amounts as strings)

### Reading transaction returns null
- Verify transaction was written successfully (check `streamTxHash`)
- Wait a few seconds after writing (blockchain confirmation time)
- Check that `publisherAddress` matches the one used to write
- Verify `transactionId` is correct

### "Insufficient funds" error
- Publisher wallet needs STT tokens
- Get publisher address and request faucet funds
- Wait for tokens to arrive (usually 1-2 minutes)

---

## Important Notes

1. **Publisher Wallet:** The Data Streams service uses a deterministic wallet generated from `ENCRYPTION_KEY`. This wallet needs STT tokens to write data.

2. **Gas Fees:** Each write operation costs gas. Make sure the publisher wallet has sufficient STT tokens.

3. **Confirmation Time:** After writing, wait a few seconds before reading to allow blockchain confirmation.

4. **Deterministic Publisher:** The same `ENCRYPTION_KEY` will always generate the same publisher address.

5. **Schema ID:** The schema ID is computed from the schema string. Changing the schema will change the ID.

---

## Success Criteria

✅ **Chunk 4 is working if:**
1. Server starts without errors
2. Schema endpoint returns schema information
3. Publisher address is generated correctly
4. Can write transactions to Data Streams
5. Can read transactions back from Data Streams
6. Can get all transactions for a publisher
7. Data encoding/decoding works correctly

If all these pass, **Chunk 4 is complete!** 🎉

---

## Next Steps

After Chunk 4 is working:
- **Chunk 5:** Transaction Execution (swap logic)
- **Chunk 6:** Calendar Agent (automated monitoring)
- **Chunk 7:** Frontend Dashboard

