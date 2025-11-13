# Testing Chunk 2: Google Calendar Integration

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Calendar status shows "not authenticated"
- [ ] Auth URL is generated successfully
- [ ] OAuth flow completes (browser)
- [ ] Calendar status shows "authenticated"
- [ ] Can fetch calendar events
- [ ] Can create a test event
- [ ] Event appears in Google Calendar

---

## Step-by-Step Testing

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
🚀 Epochi backend running on port 3001
📊 Environment: development
🔗 Network: testnet
📅 Calendar polling interval: 30s
💡 Health Check: http://localhost:3001/health
📅 Calendar auth: http://localhost:3001/api/calendar/auth
```

**If you see errors:**
- Check that `.env` file exists and has all Google credentials
- Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are set

---

### 2. Test Health Endpoint

**Using curl (PowerShell):**
```powershell
curl http://localhost:3001/health
```

**Using browser:**
Open: http://localhost:3001/health

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-20T...",
  "service": "Epochi Backend",
  "version": "1.0.0",
  "network": "testnet"
}
```

---

### 3. Check Calendar Authentication Status

**Using curl:**
```powershell
curl http://localhost:3001/api/calendar/status
```

**Expected Response (before auth):**
```json
{
  "success": true,
  "authenticated": false,
  "message": "Not authenticated - please visit /api/calendar/auth"
}
```

---

### 4. Get OAuth Authorization URL

**Using curl:**
```powershell
curl http://localhost:3001/api/calendar/auth
```

**Expected Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Please visit the authUrl to authenticate"
}
```

**Copy the `authUrl` value** - you'll need it in the next step.

---

### 5. Complete OAuth Flow (Browser)

1. **Open the authUrl in your browser:**
   - Copy the `authUrl` from step 4
   - Paste it in your browser address bar
   - Press Enter

2. **Sign in with Google:**
   - Use the Google account that has access to your calendar
   - Click "Allow" to grant permissions

3. **Handle the redirect:**
   - You'll be redirected to: `http://localhost:3001/auth/google/callback?code=...`
   - The backend will exchange the code for tokens
   - You should see a success message

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully authenticated with Google Calendar!",
  "redirect": "http://localhost:3000"
}
```

**Check server logs** - you should see:
```
✅ Calendar authentication successful!
💾 Calendar tokens saved.
```

**Verify tokens file created:**
```bash
# Check if tokens directory exists
ls tokens/calendar.tokens.json
```

---

### 6. Verify Authentication Status

**Using curl:**
```powershell
curl http://localhost:3001/api/calendar/status
```

**Expected Response (after auth):**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authenticated with Google Calendar"
}
```

✅ **If you see `"authenticated": true`, OAuth is working!**

---

### 7. Test Fetching Calendar Events

**Using curl:**
```powershell
curl http://localhost:3001/api/calendar/events
```

**Expected Response:**
```json
{
  "success": true,
  "count": 5,
  "events": [
    {
      "id": "abc123...",
      "summary": "Meeting with Team",
      "description": "...",
      "start": "2024-12-20T14:00:00Z",
      "end": "2024-12-20T15:00:00Z",
      "status": "confirmed",
      "htmlLink": "https://calendar.google.com/..."
    }
  ]
}
```

✅ **If you see events, calendar reading is working!**

---

### 8. Test Creating a Calendar Event

**Using curl (PowerShell):**
```powershell
$body = @{
    summary = "Test Event from Epochi"
    startTime = "2024-12-25T10:00:00Z"
    endTime = "2024-12-25T11:00:00Z"
    description = "This is a test event created via Epochi API"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/calendar/events `
  -H "Content-Type: application/json" `
  -d $body
```

**Or using Invoke-RestMethod (easier):**
```powershell
$event = @{
    summary = "Test Event from Epochi"
    startTime = "2024-12-25T10:00:00Z"
    endTime = "2024-12-25T11:00:00Z"
    description = "This is a test event created via Epochi API"
}

Invoke-RestMethod -Uri http://localhost:3001/api/calendar/events `
  -Method POST `
  -ContentType "application/json" `
  -Body ($event | ConvertTo-Json)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Calendar event created successfully",
  "event": {
    "id": "xyz789...",
    "summary": "Test Event from Epochi",
    "description": "...",
    "start": "2024-12-25T10:00:00Z",
    "end": "2024-12-25T11:00:00Z",
    "status": "confirmed",
    "htmlLink": "https://calendar.google.com/..."
  }
}
```

✅ **If you see a success response, event creation is working!**

---

### 9. Verify Event in Google Calendar

1. Go to [Google Calendar](https://calendar.google.com)
2. Navigate to December 25, 2024 (or your test date)
3. Look for "Test Event from Epochi"
4. Click on it to verify details

✅ **If the event appears, everything is working perfectly!**

---

### 10. Test Additional Endpoints

**Get events in a date range:**
```powershell
$start = "2024-12-20T00:00:00Z"
$end = "2024-12-31T23:59:59Z"
Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events/range?start=$start&end=$end"
```

**Update an event (replace EVENT_ID):**
```powershell
$updates = @{
    summary = "Updated Event Title"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events/EVENT_ID" `
  -Method PATCH `
  -ContentType "application/json" `
  -Body $updates
```

**Delete an event (replace EVENT_ID):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events/EVENT_ID" `
  -Method DELETE
```

---

## Troubleshooting

### Server won't start
- Check `.env` file exists and has all required variables
- Verify no port conflicts (port 3001)
- Check for TypeScript compilation errors

### OAuth redirect fails
- Verify `GOOGLE_REDIRECT_URI` in `.env` matches Google Cloud Console
- Check that redirect URI is added in Google Cloud Console OAuth credentials
- Ensure redirect URI is exactly: `http://localhost:3001/auth/google/callback`

### "Not authenticated" after OAuth
- Check server logs for errors
- Verify `tokens/calendar.tokens.json` file was created
- Try deleting tokens file and re-authenticating

### Can't fetch events
- Verify you're authenticated (`/api/calendar/status`)
- Check Google Calendar API is enabled in Google Cloud Console
- Verify `CALENDAR_ID` in `.env` is correct (usually "primary")

### Event creation fails
- Check event dates are in the future (or past if testing)
- Verify date format is ISO 8601: `2024-12-25T10:00:00Z`
- Check server logs for detailed error messages

---

## Quick Test Script

Save this as `test-calendar.ps1` and run it:

```powershell
# Test Calendar Integration
Write-Host "Testing Epochi Calendar Integration..." -ForegroundColor Cyan

# 1. Health check
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3001/health"
Write-Host "✅ Health: $($health.status)" -ForegroundColor Green

# 2. Calendar status
Write-Host "`n2. Checking calendar authentication..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/status"
if ($status.authenticated) {
    Write-Host "✅ Authenticated: Yes" -ForegroundColor Green
} else {
    Write-Host "⚠️  Authenticated: No - Run OAuth flow first" -ForegroundColor Yellow
    Write-Host "   Auth URL: http://localhost:3001/api/calendar/auth" -ForegroundColor Cyan
    exit
}

# 3. Fetch events
Write-Host "`n3. Fetching calendar events..." -ForegroundColor Yellow
$events = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events"
Write-Host "✅ Found $($events.count) events" -ForegroundColor Green

# 4. Create test event
Write-Host "`n4. Creating test event..." -ForegroundColor Yellow
$testEvent = @{
    summary = "Epochi Test Event"
    startTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
    endTime = (Get-Date).AddDays(1).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
    description = "Automated test from Epochi"
}
$created = Invoke-RestMethod -Uri "http://localhost:3001/api/calendar/events" `
    -Method POST `
    -ContentType "application/json" `
    -Body ($testEvent | ConvertTo-Json)
Write-Host "✅ Event created: $($created.event.summary)" -ForegroundColor Green
Write-Host "   Event ID: $($created.event.id)" -ForegroundColor Gray

Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
```

Run with:
```powershell
.\test-calendar.ps1
```

---

## Success Criteria

✅ **Chunk 2 is working if:**
1. Server starts without errors
2. Health endpoint returns 200 OK
3. OAuth flow completes successfully
4. Can fetch calendar events
5. Can create calendar events
6. Events appear in Google Calendar

If all these pass, **Chunk 2 is complete!** 🎉

