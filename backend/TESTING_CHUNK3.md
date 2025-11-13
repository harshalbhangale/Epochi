# Testing Chunk 3: Somnia Wallet Service

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Network status endpoint responds
- [ ] Wallet generation works for calendar ID
- [ ] Wallet address is deterministic (same calendar ID = same address)
- [ ] Balance checking works
- [ ] Network connection to Somnia testnet is working

---

## Step-by-Step Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Somnia Wallet Service initialized
🔗 Connected to: Somnia Testnet
📡 RPC: https://dream-rpc.somnia.network
🚀 Epochi backend running on port 3001
```

---

### 2. Test Network Status

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/wallet/network/status
```

**Expected Response:**
```json
{
  "success": true,
  "network": {
    "network": "Somnia Testnet",
    "chainId": 50311,
    "blockNumber": "12345678",
    "gasPrice": "0.000000001",
    "gasPriceGwei": "1.00",
    "rpcUrl": "https://dream-rpc.somnia.network",
    "explorerUrl": "https://somnia.explorer.caldera.xyz"
  }
}
```

✅ **If you see network status, the connection is working!**

---

### 3. Generate Wallet for Calendar ID

**Using PowerShell:**
```powershell
# Use "primary" as calendar ID (or any calendar ID)
$calendarId = "primary"
Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"
```

**Expected Response:**
```json
{
  "success": true,
  "wallet": {
    "address": "0x1234...",
    "balance": "0",
    "balanceFormatted": "0.0",
    "network": "Somnia Testnet",
    "explorerUrl": "https://somnia.explorer.caldera.xyz/address/0x1234...",
    "chainId": 50311
  }
}
```

**Check server logs** - you should see:
```
🔑 Generated wallet for calendar: primary...
📍 Address: 0x1234...
```

✅ **If you see a wallet address, wallet generation is working!**

---

### 4. Test Deterministic Wallet Generation

**Important:** The same calendar ID should always generate the same wallet address.

**Test 1:**
```powershell
$calendarId = "primary"
$wallet1 = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"
$wallet1.wallet.address
```

**Test 2 (same calendar ID):**
```powershell
$wallet2 = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"
$wallet2.wallet.address
```

**Compare:** `$wallet1.wallet.address` should equal `$wallet2.wallet.address`

✅ **If addresses match, deterministic generation is working!**

---

### 5. Get Wallet Address Only

**Using PowerShell:**
```powershell
$calendarId = "primary"
Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId/address"
```

**Expected Response:**
```json
{
  "success": true,
  "address": "0x1234..."
}
```

---

### 6. Request Faucet Funds (Instructions)

**Using PowerShell:**
```powershell
$calendarId = "primary"
Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId/faucet" -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Faucet request initiated",
  "address": "0x1234...",
  "faucetUrl": "https://faucet.somnia.network",
  "instructions": "Visit https://faucet.somnia.network and paste your address: 0x1234..."
}
```

**Next Steps:**
1. Copy the `address` from the response
2. Visit https://faucet.somnia.network
3. Paste your address and request testnet tokens
4. Wait a few minutes for tokens to arrive
5. Check balance again: `Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"`

---

### 7. Test Transaction (After Getting Faucet Funds)

**Note:** You need testnet tokens first (from step 6).

**Using PowerShell:**
```powershell
$calendarId = "primary"
$body = @{
    to = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"  # Example recipient
    amount = "0.1"  # Amount in STT
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId/send" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Expected Response (if successful):**
```json
{
  "success": true,
  "message": "Transaction sent successfully",
  "hash": "0xabc123...",
  "explorerUrl": "https://somnia.explorer.caldera.xyz/tx/0xabc123..."
}
```

**Expected Response (if insufficient balance):**
```json
{
  "success": false,
  "error": "Insufficient balance for transaction"
}
```

---

## Quick Test Script

Save this as `test-wallet.ps1`:

```powershell
# Test Somnia Wallet Service
Write-Host "Testing Epochi Wallet Service..." -ForegroundColor Cyan

# 1. Network status
Write-Host "`n1. Testing network connection..." -ForegroundColor Yellow
try {
    $network = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/network/status"
    Write-Host "✅ Network: $($network.network.network)" -ForegroundColor Green
    Write-Host "   Chain ID: $($network.network.chainId)" -ForegroundColor Gray
    Write-Host "   Block: $($network.network.blockNumber)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Network connection failed" -ForegroundColor Red
    exit
}

# 2. Generate wallet
Write-Host "`n2. Generating wallet for calendar 'primary'..." -ForegroundColor Yellow
$calendarId = "primary"
try {
    $wallet1 = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"
    Write-Host "✅ Wallet generated: $($wallet1.wallet.address)" -ForegroundColor Green
    Write-Host "   Balance: $($wallet1.wallet.balanceFormatted) STT" -ForegroundColor Gray
} catch {
    Write-Host "❌ Wallet generation failed" -ForegroundColor Red
    exit
}

# 3. Test deterministic generation
Write-Host "`n3. Testing deterministic generation..." -ForegroundColor Yellow
$wallet2 = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId"
if ($wallet1.wallet.address -eq $wallet2.wallet.address) {
    Write-Host "✅ Deterministic generation working (addresses match)" -ForegroundColor Green
} else {
    Write-Host "❌ Addresses don't match!" -ForegroundColor Red
}

# 4. Get address only
Write-Host "`n4. Getting wallet address..." -ForegroundColor Yellow
$address = Invoke-RestMethod -Uri "http://localhost:3001/api/wallet/$calendarId/address"
Write-Host "✅ Address: $($address.address)" -ForegroundColor Green

Write-Host "`n🎉 All wallet tests passed!" -ForegroundColor Green
Write-Host "`n💡 Next: Request faucet funds to test transactions" -ForegroundColor Cyan
Write-Host "   POST http://localhost:3001/api/wallet/$calendarId/faucet" -ForegroundColor Gray
```

Run with:
```powershell
.\test-wallet.ps1
```

---

## Troubleshooting

### Server won't start
- Check `.env` file has `SOMNIA_RPC_URL` set
- Verify `ENCRYPTION_KEY` is set (used for wallet generation)
- Check for TypeScript compilation errors

### Network status fails
- Verify `SOMNIA_RPC_URL` in `.env` is correct: `https://dream-rpc.somnia.network`
- Check internet connection
- Verify Somnia testnet is accessible

### Wallet generation fails
- Check `ENCRYPTION_KEY` is set in `.env`
- Verify calendar ID is provided
- Check server logs for detailed errors

### Addresses are different each time
- This shouldn't happen - addresses should be deterministic
- Verify `ENCRYPTION_KEY` hasn't changed
- Check that same calendar ID produces same address

### Transaction fails
- Ensure wallet has sufficient balance (get faucet funds first)
- Verify recipient address is valid
- Check amount is positive and valid format
- Check server logs for detailed error messages

---

## Success Criteria

✅ **Chunk 3 is working if:**
1. Server starts without errors
2. Network status endpoint returns Somnia testnet info
3. Wallet generation works for any calendar ID
4. Same calendar ID always generates same wallet address
5. Balance checking works
6. Network connection to Somnia RPC is successful

If all these pass, **Chunk 3 is complete!** 🎉

---

## Next Steps

After Chunk 3 is working:
- **Chunk 4:** Data Streams Setup (on-chain event records)
- **Chunk 5:** Transaction Execution (swap logic)
- **Chunk 6:** Calendar Agent (automated monitoring)

