# Testing Chunk 6: Calendar Monitoring Agent

## Quick Test Checklist

- [ ] Agent initializes without errors
- [ ] Can check agent status
- [ ] Can start the agent
- [ ] Agent detects calendar events
- [ ] Agent queues transactions
- [ ] Agent executes transactions at scheduled time
- [ ] Calendar events are updated with results
- [ ] Can stop the agent

---

## Step-by-Step Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
🤖 Calendar Agent initialized
🚀 Epochi backend running on port 3001
```

---

### 2. Check Agent Status

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/status
```

**Expected Response (before starting):**
```json
{
  "success": true,
  "agent": {
    "isRunning": false,
    "lastCheckTime": null,
    "totalChecks": 0,
    "transactionsDetected": 0,
    "transactionsExecuted": 0,
    "transactionsFailed": 0,
    "queueSize": 0
  }
}
```

---

### 3. Ensure Calendar is Authenticated

**Check calendar status:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/calendar/status
```

**If not authenticated:**
1. Get auth URL: `Invoke-RestMethod -Uri http://localhost:3001/api/calendar/auth`
2. Visit the `authUrl` in your browser
3. Complete OAuth flow

---

### 4. Create a Test Calendar Event

**Option A: Create via Google Calendar UI**
1. Go to [Google Calendar](https://calendar.google.com)
2. Create a new event with title: `Swap 0.1 ETH to USDC`
3. Set time to 1-2 minutes in the future
4. Save the event

**Option B: Create via API**
```powershell
$event = @{
    summary = "Swap 0.1 ETH to USDC"
    startTime = (Get-Date).AddMinutes(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
    endTime = (Get-Date).AddMinutes(3).ToString("yyyy-MM-ddTHH:mm:ssZ")
    description = "Test transaction for Calendar Agent"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3001/api/calendar/events `
  -Method POST `
  -ContentType "application/json" `
  -Body $event
```

**Save the `eventId` from the response!**

---

### 5. Start the Calendar Agent

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/start -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Calendar Agent started successfully"
}
```

**Check server logs** - you should see:
```
🚀 Starting Calendar Agent...
📅 Calendar ID: primary
⏱️ Check interval: Every 30 seconds
✅ Calendar Agent started successfully
🔍 Monitoring for transaction events...
🔍 Checking calendar... (Check #1)
```

---

### 6. Check Agent Status (Running)

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/status
```

**Expected Response:**
```json
{
  "success": true,
  "agent": {
    "isRunning": true,
    "lastCheckTime": "2024-12-20T15:30:00.000Z",
    "totalChecks": 1,
    "transactionsDetected": 1,
    "transactionsExecuted": 0,
    "transactionsFailed": 0,
    "queueSize": 1
  }
}
```

✅ **If `isRunning: true` and `transactionsDetected: 1`, the agent is working!**

---

### 7. Check Transaction Queue

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "queue": [
    {
      "eventTitle": "Swap 0.1 ETH to USDC",
      "type": "swap",
      "formatted": "0.1 ETH → USDC",
      "executionTime": "2024-12-20T15:32:00.000Z",
      "timeUntilExecution": 120,
      "attempts": 0,
      "addedAt": "2024-12-20T15:30:00.000Z"
    }
  ]
}
```

✅ **If you see your transaction in the queue, detection is working!**

---

### 8. Monitor Agent Execution

**Watch server logs** - you should see:
```
🔍 Checking calendar... (Check #2)
⏳ Waiting for Swap 0.1 ETH to USDC (60s)
...
🔍 Checking calendar... (Check #3)
🚀 Executing transaction: Swap 0.1 ETH to USDC
🔄 Executing swap: 0.1 ETH → USDC
✅ Swap executed! Received ~250 USDC
📊 Transaction recorded to Data Streams: 0xabc123...
✅ Transaction executed successfully!
```

**After execution time arrives**, check the queue again:
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue
```

The transaction should be removed from the queue (executed).

---

### 9. Verify Calendar Event Updated

**Check the event in Google Calendar:**
1. Go to [Google Calendar](https://calendar.google.com)
2. Find your test event
3. Click on it to view details
4. You should see in the description:
   ```
   ✅ Transaction Executed!
   ━━━━━━━━━━━━━━━━━━━━
   🔗 Transaction: https://shannon-explorer.somnia.network/tx/...
   💰 Received: 250 USDC
   📊 Data Stream: 0xabc123...
   ⏰ Executed: 2024-12-20T15:32:00.000Z
   ```

✅ **If the event is updated, full automation is working!**

---

### 10. Check Final Agent Status

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/status
```

**Expected Response:**
```json
{
  "success": true,
  "agent": {
    "isRunning": true,
    "lastCheckTime": "2024-12-20T15:35:00.000Z",
    "totalChecks": 10,
    "transactionsDetected": 1,
    "transactionsExecuted": 1,
    "transactionsFailed": 0,
    "queueSize": 0
  }
}
```

✅ **If `transactionsExecuted: 1`, the agent successfully executed your transaction!**

---

### 11. Stop the Agent

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/stop -Method POST
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Calendar Agent stopped successfully"
}
```

**Check server logs:**
```
🛑 Stopping Calendar Agent...
✅ Calendar Agent stopped
```

---

## Quick Test Script

Save this as `test-agent.ps1`:

```powershell
# Test Calendar Agent
Write-Host "Testing Epochi Calendar Agent..." -ForegroundColor Cyan

# 1. Check status
Write-Host "`n1. Checking agent status..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status"
Write-Host "   Running: $($status.agent.isRunning)" -ForegroundColor $(if ($status.agent.isRunning) { "Green" } else { "Yellow" })
Write-Host "   Checks: $($status.agent.totalChecks)" -ForegroundColor Gray
Write-Host "   Detected: $($status.agent.transactionsDetected)" -ForegroundColor Gray
Write-Host "   Executed: $($status.agent.transactionsExecuted)" -ForegroundColor Gray

# 2. Check calendar auth
Write-Host "`n2. Checking calendar authentication..." -ForegroundColor Yellow
$calendarStatus = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/status"
if (-not $calendarStatus.authenticated) {
    Write-Host "   ⚠️  Calendar not authenticated!" -ForegroundColor Red
    Write-Host "   Visit: http://localhost:3001/api/calendar/auth" -ForegroundColor Cyan
    exit
}
Write-Host "   ✅ Calendar authenticated" -ForegroundColor Green

# 3. Start agent
Write-Host "`n3. Starting agent..." -ForegroundColor Yellow
$start = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/start" -Method POST
Write-Host "   ✅ $($start.message)" -ForegroundColor Green

# Wait a moment
Start-Sleep -Seconds 2

# 4. Check queue
Write-Host "`n4. Checking transaction queue..." -ForegroundColor Yellow
$queue = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/queue"
Write-Host "   Queue size: $($queue.count)" -ForegroundColor $(if ($queue.count -gt 0) { "Green" } else { "Gray" })
if ($queue.count -gt 0) {
    foreach ($tx in $queue.queue) {
        Write-Host "   - $($tx.formatted) (in $($tx.timeUntilExecution)s)" -ForegroundColor Cyan
    }
}

# 5. Final status
Write-Host "`n5. Final agent status..." -ForegroundColor Yellow
$finalStatus = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status"
Write-Host "   ✅ Agent running: $($finalStatus.agent.isRunning)" -ForegroundColor Green
Write-Host "   📊 Stats:" -ForegroundColor Cyan
Write-Host "      Checks: $($finalStatus.agent.totalChecks)" -ForegroundColor Gray
Write-Host "      Detected: $($finalStatus.agent.transactionsDetected)" -ForegroundColor Gray
Write-Host "      Executed: $($finalStatus.agent.transactionsExecuted)" -ForegroundColor Gray
Write-Host "      Queue: $($finalStatus.agent.queueSize)" -ForegroundColor Gray

Write-Host "`n🎉 Agent test completed!" -ForegroundColor Green
Write-Host "`n💡 Monitor server logs to see agent activity" -ForegroundColor Cyan
```

Run with:
```powershell
.\test-agent.ps1
```

---

## Troubleshooting

### Agent won't start
- **Check calendar authentication:** `GET /api/calendar/status`
- Verify calendar is authenticated before starting agent
- Check server logs for detailed errors

### No transactions detected
- Verify calendar events exist
- Check event titles match transaction patterns:
  - Swap: "Swap 0.1 ETH to USDC", "0.1 ETH -> USDC"
  - Transfer: "Send 0.1 ETH to 0x123..."
- Ensure events are in the next 24 hours
- Check event start times are set correctly

### Transactions not executing
- Verify execution time has passed (check `timeUntilExecution` in queue)
- Check wallet has sufficient balance
- Verify Data Streams service is initialized
- Check server logs for execution errors

### Agent stops unexpectedly
- Check server logs for errors
- Verify calendar authentication hasn't expired
- Check network connectivity to Somnia RPC

### Queue not clearing
- Transactions are removed after successful execution
- Failed transactions retry up to 3 times
- Check server logs for execution errors
- Verify transaction execution time has passed

---

## Agent Configuration

The agent uses these environment variables (from `.env`):

- `CALENDAR_POLL_INTERVAL` - Check interval in seconds (default: 30)
- `CALENDAR_ID` - Calendar to monitor (default: "primary")

---

## Success Criteria

✅ **Chunk 6 is working if:**
1. Agent initializes without errors
2. Can start/stop agent via API
3. Agent detects transaction events from calendar
4. Transactions are queued correctly
5. Agent executes transactions at scheduled time
6. Calendar events are updated with execution results
7. Statistics track correctly (detected, executed, failed)

If all these pass, **Chunk 6 is complete!** 🎉

---

## Next Steps

After Chunk 6 is working:
- **Chunk 7:** Frontend Dashboard (Next.js UI)
- **Chunk 8:** Testing & Deployment

Your Epochi backend is now fully automated! 🚀

