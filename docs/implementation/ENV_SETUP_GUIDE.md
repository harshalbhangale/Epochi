# 🔐 Epochi Environment Variables Guide

Complete guide to getting all the environment variables you need for Epochi.

## 📋 All Required Environment Variables

```bash
# Server Configuration
PORT=3001                          # ✅ Already set (backend port)
NODE_ENV=development               # ✅ Already set

# Google Calendar API
GOOGLE_CLIENT_ID=                  # ⚠️ REQUIRED - Get from Google Cloud Console
GOOGLE_CLIENT_SECRET=              # ⚠️ REQUIRED - Get from Google Cloud Console
GOOGLE_PROJECT_ID=                 # ⚠️ REQUIRED - Get from Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback  # ✅ Already set
CALENDAR_ID=primary                # ✅ Already set (uses your primary calendar)

# Somnia Network Configuration
SOMNIA_RPC_URL=https://dream-rpc.somnia.network  # ✅ Already set (testnet)
SOMNIA_CHAIN_ID=50311              # ✅ Already set (testnet chain ID)
SOMNIA_EXPLORER_URL=https://somnia.explorer.caldera.xyz  # ✅ Already set
SOMNIA_NETWORK=testnet             # ✅ Already set

# Somnia Data Streams
STREAMS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000  # ✅ Placeholder (will update when needed)

# Security
ENCRYPTION_KEY=                    # ⚠️ REQUIRED - Generate a secure key

# Monitoring
CALENDAR_POLL_INTERVAL=30          # ✅ Already set (check every 30 seconds)
LOG_LEVEL=info                     # ✅ Already set
```

## 🚀 Quick Setup (3 Variables Needed)

You only need to get **3 things** to start:

1. ✅ **Google Calendar API Credentials** (Client ID, Secret, Project ID)
2. ✅ **Encryption Key** (Generate locally)
3. ✅ **Somnia Testnet Tokens** (Get from faucet - later)

---

## 📖 Detailed Guide for Each Variable

### 1️⃣ Google Calendar API Credentials

**What you need:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_PROJECT_ID`

**How to get them:**

#### Step 1: Go to Google Cloud Console
🔗 https://console.cloud.google.com/

#### Step 2: Create a New Project
1. Click project selector dropdown (top left)
2. Click "New Project"
3. Enter details:
   - **Project name**: `Epochi` (or any name you want)
   - **Organization**: Leave as-is
4. Click **Create**
5. Wait 10-30 seconds for project creation
6. **Save the Project ID** that appears (e.g., `epochi-123456`)

```bash
GOOGLE_PROJECT_ID=epochi-123456  # ✅ This is your project ID
```

#### Step 3: Enable Calendar API
1. In your new project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it
4. Click **Enable**
5. Wait for activation

#### Step 4: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Click **Create**
4. Fill in required fields:
   - **App name**: `Epochi`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**

6. **Add Scopes:**
   - Click "Add or Remove Scopes"
   - Search and add:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Click **Update** then **Save and Continue**

7. **Add Test Users:**
   - Click "Add Users"
   - Add your Gmail address
   - Click **Add** then **Save and Continue**

8. Review summary and click **Back to Dashboard**

#### Step 5: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Fill in:
   - **Name**: `Epochi Backend`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3001/auth/google/callback`
5. Click **Create**

6. **Copy your credentials!** 🎯
   ```
   Client ID: 123456789-abcdefgh.apps.googleusercontent.com
   Client Secret: GOCSPX-AbCdEfGh1234567890
   ```

7. Add to your `.env`:
```bash
GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGh1234567890
GOOGLE_PROJECT_ID=epochi-123456
```

**✅ Google Calendar API: COMPLETE!**

---

### 2️⃣ Encryption Key

**What you need:**
- `ENCRYPTION_KEY`

**Why:** Used to generate deterministic wallets securely.

**How to get it:**

#### Option 1: Generate with Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### Option 2: Generate Online
🔗 https://generate-random.org/encryption-key-generator?count=1&bytes=32&cipher=aes-256-cbc&string=&password=

#### Option 3: Use OpenSSL
```bash
openssl rand -hex 32
```

**Add to your `.env`:**
```bash
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**⚠️ IMPORTANT:**
- Use a different key for production
- Never commit this to git
- Keep it secret!

**✅ Encryption Key: COMPLETE!**

---

### 3️⃣ Somnia Network (Already Configured!)

These are **already set correctly** in your `.env.example`:

```bash
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50311
SOMNIA_EXPLORER_URL=https://somnia.explorer.caldera.xyz
SOMNIA_NETWORK=testnet
```

**No action needed!** ✅

---

### 4️⃣ Server Configuration (Already Set!)

These are **already configured**:

```bash
PORT=3001                  # Backend runs on port 3001
NODE_ENV=development       # Development mode
CALENDAR_ID=primary        # Uses your primary Google Calendar
CALENDAR_POLL_INTERVAL=30  # Check calendar every 30 seconds
LOG_LEVEL=info            # Logging level
```

**No action needed!** ✅

---

## 📝 Complete .env File Example

Here's what your **complete** `.env` file should look like:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Calendar API (⚠️ ADD YOUR VALUES HERE)
GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGh1234567890
GOOGLE_PROJECT_ID=epochi-123456
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
CALENDAR_ID=primary

# Somnia Network Configuration (✅ ALREADY CORRECT)
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50311
SOMNIA_EXPLORER_URL=https://somnia.explorer.caldera.xyz
SOMNIA_NETWORK=testnet

# Somnia Data Streams (✅ OK FOR NOW)
STREAMS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Security (⚠️ ADD YOUR GENERATED KEY HERE)
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Monitoring (✅ ALREADY CORRECT)
CALENDAR_POLL_INTERVAL=30
LOG_LEVEL=info
```

---

## ✅ Setup Checklist

Before starting Chunk 2, make sure you have:

- [ ] Created Google Cloud project
- [ ] Enabled Calendar API
- [ ] Configured OAuth consent screen
- [ ] Added yourself as test user
- [ ] Created OAuth 2.0 credentials
- [ ] Copied Client ID to `.env`
- [ ] Copied Client Secret to `.env`
- [ ] Copied Project ID to `.env`
- [ ] Generated encryption key
- [ ] Added encryption key to `.env`
- [ ] Verified all other variables are set

---

## 🧪 Test Your Configuration

Once you've added the variables, test them:

```bash
cd /Users/buddyharshal/Desktop/somania/epochi/backend

# Check if .env is loaded
npm run dev

# In another terminal
curl http://localhost:3001/health
```

If you see the backend start without errors, your environment is configured! ✅

---

## 🚨 Troubleshooting

### "Missing environment variables"
- Make sure your `.env` file is in the `backend/` directory
- Check for typos in variable names
- Restart the server after editing `.env`

### "Invalid Client ID"
- Make sure you copied the full Client ID (ends in `.apps.googleusercontent.com`)
- No extra spaces or quotes
- Client ID is from "Web application" type

### "Redirect URI mismatch"
- In Google Cloud Console, ensure redirect URI is exactly:
  `http://localhost:3001/auth/google/callback`
- No trailing slash
- Port must be 3001

---

## 🎯 What's Next?

Once you have all 3 required variables:
1. ✅ Google Calendar credentials
2. ✅ Encryption key  
3. ✅ Everything else is pre-configured

You're ready for **Chunk 2: Google Calendar Integration**! 🚀

In Chunk 2, you'll:
- Use these credentials to authenticate
- Implement CalendarService
- Test reading/writing calendar events
- Set up OAuth flow

---

## 📚 Resources

- **Google Cloud Console**: https://console.cloud.google.com/
- **Calendar API Docs**: https://developers.google.com/calendar
- **Somnia Docs**: https://docs.somnia.network
- **Somnia Faucet**: https://faucet.somnia.network (for later)

---

**Need help?** Each step in Chunk 2 documentation has detailed screenshots and troubleshooting!

