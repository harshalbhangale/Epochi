# 🚀 Quick Test Guide - Calendar Agent (Server Already Running)

## Method 1: PowerShell Commands (Quickest)

### Step 1: Check Agent Status
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/status
```

**Expected:** `"isRunning": false` initially

---

### Step 2: Verify Calendar is Authenticated
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/calendar/status
```

**If not authenticated:**
```powershell
# Get auth URL
$auth = Invoke-RestMethod -Uri http://localhost:3001/api/calendar/auth
Write-Host "Visit this URL: $($auth.authUrl)"
# Copy the authUrl and open in browser
```

---

### Step 3: Create a Test Calendar Event

**Option A: Via Google Calendar (Easiest)**
1. Go to https://calendar.google.com
2. Click "+ Create" or click on a time slot
3. Title: `Swap 0.1 ETH to USDC`
4. Set time to **2-3 minutes from now**
5. Click "Save"

**Option B: Via API**
```powershell
$now = Get-Date
$startTime = $now.AddMinutes(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
$endTime = $now.AddMinutes(3).ToString("yyyy-MM-ddTHH:mm:ssZ")

$event = @{
    summary = "Swap 0.1 ETH to USDC"
    startTime = $startTime
    endTime = $endTime
    description = "Test transaction for Calendar Agent"
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri http://localhost:3001/api/calendar/events `
    -Method POST `
    -ContentType "application/json" `
    -Body $event

Write-Host "Event created: $($created.event.id)" -ForegroundColor Green
```

---

### Step 4: Start the Agent
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
✅ Calendar Agent started successfully
🔍 Checking calendar... (Check #1)
```

---

### Step 5: Check Queue (See if Event Detected)
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
      "attempts": 0
    }
  ]
}
```

✅ **If you see your event in the queue, detection is working!**

---

### Step 6: Monitor Agent Status
```powershell
# Run this every 10 seconds to watch progress
while ($true) {
    Clear-Host
    $status = Invoke-RestMethod -Uri http://localhost:3001/api/agent/status
    Write-Host "═══════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Calendar Agent Status" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Running: $($status.agent.isRunning)" -ForegroundColor $(if ($status.agent.isRunning) { "Green" } else { "Red" })
    Write-Host "Total Checks: $($status.agent.totalChecks)" -ForegroundColor Yellow
    Write-Host "Detected: $($status.agent.transactionsDetected)" -ForegroundColor Cyan
    Write-Host "Executed: $($status.agent.transactionsExecuted)" -ForegroundColor Green
    Write-Host "Failed: $($status.agent.transactionsFailed)" -ForegroundColor Red
    Write-Host "Queue Size: $($status.agent.queueSize)" -ForegroundColor Yellow
    Write-Host "Last Check: $($status.agent.lastCheckTime)" -ForegroundColor Gray
    Write-Host ""
    
    $queue = Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue
    if ($queue.count -gt 0) {
        Write-Host "Queued Transactions:" -ForegroundColor Cyan
        foreach ($tx in $queue.queue) {
            $timeLeft = $tx.timeUntilExecution
            Write-Host "  • $($tx.formatted) - $timeLeft seconds remaining" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No transactions in queue" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 10
}
```

**Press Ctrl+C to stop monitoring**

---

### Step 7: Verify Execution (After Time Passes)

**Check queue again:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue
```

**If transaction executed, queue should be empty and you'll see in server logs:**
```
🚀 Executing transaction: Swap 0.1 ETH to USDC
✅ Transaction executed successfully!
```

**Check calendar event:**
- Go to Google Calendar
- Open your test event
- Description should show: `✅ Transaction Executed!`

---

### Step 8: Stop Agent (When Done Testing)
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/agent/stop -Method POST
```

---

## Method 2: Browser Testing (Visual)

### 1. Check Agent Status
Open in browser:
```
http://localhost:3001/api/agent/status
```

### 2. Start Agent
Open in browser (GET request, but POST is better):
```
http://localhost:3001/api/agent/start
```

**Better: Use browser console:**
```javascript
// Open browser console (F12) and run:
fetch('http://localhost:3001/api/agent/start', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### 3. Check Queue
Open in browser:
```
http://localhost:3001/api/agent/queue
```

---

## Method 3: curl Commands (Alternative)

```bash
# Check status
curl http://localhost:3001/api/agent/status

# Start agent
curl -X POST http://localhost:3001/api/agent/start

# Check queue
curl http://localhost:3001/api/agent/queue

# Stop agent
curl -X POST http://localhost:3001/api/agent/stop
```

---

## Method 4: Complete Test Script

Save this as `test-agent-now.ps1`:

```powershell
# Complete Agent Test Script
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Epochi Calendar Agent - Quick Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Check calendar auth
Write-Host "[1/6] Checking calendar authentication..." -ForegroundColor Yellow
$calendarStatus = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/status"
if (-not $calendarStatus.authenticated) {
    Write-Host "   ❌ Calendar not authenticated!" -ForegroundColor Red
    $auth = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/auth"
    Write-Host "   🔗 Visit: $($auth.authUrl)" -ForegroundColor Cyan
    Write-Host "   ⚠️  Please authenticate first, then run this script again" -ForegroundColor Yellow
    exit
}
Write-Host "   ✅ Calendar authenticated" -ForegroundColor Green

# 2. Check agent status
Write-Host "`n[2/6] Checking agent status..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status"
Write-Host "   Running: $($status.agent.isRunning)" -ForegroundColor $(if ($status.agent.isRunning) { "Green" } else { "Yellow" })
Write-Host "   Checks: $($status.agent.totalChecks)" -ForegroundColor Gray
Write-Host "   Detected: $($status.agent.transactionsDetected)" -ForegroundColor Gray
Write-Host "   Executed: $($status.agent.transactionsExecuted)" -ForegroundColor Gray

# 3. Create test event
Write-Host "`n[3/6] Creating test calendar event..." -ForegroundColor Yellow
$now = Get-Date
$startTime = $now.AddMinutes(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
$endTime = $now.AddMinutes(3).ToString("yyyy-MM-ddTHH:mm:ssZ")

$event = @{
    summary = "Swap 0.1 ETH to USDC"
    startTime = $startTime
    endTime = $endTime
    description = "Test transaction for Calendar Agent"
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events" `
        -Method POST `
        -ContentType "application/json" `
        -Body $event
    Write-Host "   ✅ Event created: $($created.event.summary)" -ForegroundColor Green
    Write-Host "   📅 Scheduled for: $startTime" -ForegroundColor Gray
    $eventId = $created.event.id
} catch {
    Write-Host "   ⚠️  Failed to create event (may already exist)" -ForegroundColor Yellow
    Write-Host "   💡 Create manually: 'Swap 0.1 ETH to USDC' at $startTime" -ForegroundColor Cyan
}

# 4. Start agent
Write-Host "`n[4/6] Starting Calendar Agent..." -ForegroundColor Yellow
try {
    $start = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/start" -Method POST
    Write-Host "   ✅ $($start.message)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Agent may already be running" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

# 5. Check queue
Write-Host "`n[5/6] Checking transaction queue..." -ForegroundColor Yellow
$queue = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/queue"
Write-Host "   Queue size: $($queue.count)" -ForegroundColor $(if ($queue.count -gt 0) { "Green" } else { "Yellow" })
if ($queue.count -gt 0) {
    foreach ($tx in $queue.queue) {
        $timeLeft = $tx.timeUntilExecution
        Write-Host "   📋 $($tx.formatted)" -ForegroundColor Cyan
        Write-Host "      ⏰ Executes in: $timeLeft seconds" -ForegroundColor Gray
    }
} else {
    Write-Host "   ℹ️  No transactions in queue (check if event was created)" -ForegroundColor Gray
}

# 6. Final status
Write-Host "`n[6/6] Final agent status..." -ForegroundColor Yellow
$finalStatus = Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status"
Write-Host "   ✅ Agent running: $($finalStatus.agent.isRunning)" -ForegroundColor Green
Write-Host "   📊 Statistics:" -ForegroundColor Cyan
Write-Host "      Total Checks: $($finalStatus.agent.totalChecks)" -ForegroundColor Gray
Write-Host "      Transactions Detected: $($finalStatus.agent.transactionsDetected)" -ForegroundColor Gray
Write-Host "      Transactions Executed: $($finalStatus.agent.transactionsExecuted)" -ForegroundColor Gray
Write-Host "      Queue Size: $($finalStatus.agent.queueSize)" -ForegroundColor Gray

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Watch server logs for agent activity" -ForegroundColor Gray
Write-Host "   2. Wait for transaction execution time" -ForegroundColor Gray
Write-Host "   3. Check Google Calendar event for execution results" -ForegroundColor Gray
Write-Host "   4. Monitor queue: Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop agent: Invoke-RestMethod -Uri http://localhost:3001/api/agent/stop -Method POST" -ForegroundColor Yellow
```

**Run it:**
```powershell
.\test-agent-now.ps1
```

---

## Method 5: Watch Server Logs (Real-time)

**Just watch your server terminal** - you'll see:
```
🔍 Checking calendar... (Check #1)
📬 Found 1 upcoming events
🎯 Detected transaction: Swap 0.1 ETH → USDC
➕ Added to queue: Swap 0.1 ETH to USDC
✅ Check complete. Queue size: 1
...
⏳ Waiting for Swap 0.1 ETH to USDC (60s)
...
🚀 Executing transaction: Swap 0.1 ETH to USDC
✅ Transaction executed successfully!
```

---

## Quick Commands Reference

```powershell
# Status
Invoke-RestMethod -Uri http://localhost:3001/api/agent/status

# Start
Invoke-RestMethod -Uri http://localhost:3001/api/agent/start -Method POST

# Stop
Invoke-RestMethod -Uri http://localhost:3001/api/agent/stop -Method POST

# Queue
Invoke-RestMethod -Uri http://localhost:3001/api/agent/queue

# Clear cache
Invoke-RestMethod -Uri http://localhost:3001/api/agent/clear-cache -Method POST
```

---

## What to Watch For

✅ **Success Indicators:**
- Agent status shows `isRunning: true`
- Queue shows your transaction
- Server logs show "Detected transaction"
- After execution time: Server logs show "Transaction executed successfully"
- Calendar event description updated with results

❌ **If Something's Wrong:**
- Check calendar authentication
- Verify event title matches pattern ("Swap X ETH to USDC")
- Ensure execution time is in the future
- Check wallet has balance (for transfers)
- Look at server logs for errors

---

## Pro Tips

1. **Create event 2-3 minutes in future** - Don't wait too long!
2. **Watch server logs** - Best way to see what's happening
3. **Check queue every 10 seconds** - See countdown to execution
4. **Verify in Google Calendar** - See the event get updated automatically

---

**Ready to test? Run the commands above or use the test script!** 🚀

