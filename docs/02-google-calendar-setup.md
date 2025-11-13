# 📅 Chunk 2: Google Calendar Integration

In this chunk, you'll integrate Google Calendar API with OAuth 2.0 authentication, allowing Tempora to read and write calendar events automatically.

## 🎯 What You'll Build

By the end of this guide, you'll have:
- Google Cloud Console project configured
- OAuth 2.0 credentials set up
- Calendar API enabled
- Complete CalendarService implementation
- OAuth flow working
- Ability to read and write calendar events

## 📋 Prerequisites

- Completed [Chunk 1: Project Setup](01-project-setup.md)
- A Google account
- Backend server running from Chunk 1

## 🔧 Step 1: Google Cloud Console Setup

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project details:
   - **Project name**: `Tempora`
   - **Project ID**: `tempora-<random-string>` (auto-generated)
4. Click "Create"
5. Wait for project creation (30 seconds)

### Enable Calendar API

1. In the Google Cloud Console, ensure your "Tempora" project is selected
2. Navigate to **APIs & Services** → **Library**
3. Search for "Google Calendar API"
4. Click on "Google Calendar API"
5. Click **Enable**
6. Wait for activation (10-20 seconds)

### Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - Click "Configure Consent Screen"
   - Select **External** user type
   - Click "Create"
   - Fill in required fields:
     - App name: `Tempora`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes"
     - Add: `https://www.googleapis.com/auth/calendar`
     - Add: `https://www.googleapis.com/auth/calendar.events`
   - Click "Save and Continue"
   - Test users: Add your Gmail address
   - Click "Save and Continue"
4. Return to "Create OAuth client ID"
5. Select **Application type**: Web application
6. Name: `Tempora Backend`
7. Add **Authorized redirect URIs**:
   - `http://localhost:3001/auth/google/callback`
8. Click **Create**
9. **Save your credentials**:
   - Client ID: Copy and save
   - Client Secret: Copy and save

Your credentials will look like:
```
Client ID: 123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
Client Secret: GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

## 🔐 Step 2: Configure Environment Variables

Update `backend/.env`:

```bash
# Google Calendar API
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_PROJECT_ID=tempora-<your-project-id>
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
CALENDAR_ID=primary
```

## 📝 Step 3: Create Calendar Service

Create `backend/src/services/calendar/CalendarService.ts`:

```typescript
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

/**
 * CalendarService handles Google Calendar API interactions
 * Supports OAuth 2.0 authentication and CRUD operations on events
 */
export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;
  private tokensPath: string;
  private isAuthenticated: boolean = false;

  constructor() {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Path to store tokens
    this.tokensPath = path.join(process.cwd(), 'tokens', 'calendar.tokens.json');

    // Try to load existing tokens
    this.loadTokens().catch(() => {
      console.log('📅 No existing calendar tokens found. Authentication required.');
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getAccessToken(code: string): Promise<void> {
    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Set credentials
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens to file
      await this.saveTokens(tokens);
      
      // Initialize calendar instance
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.isAuthenticated = true;
      
      console.log('✅ Calendar authentication successful!');
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Save tokens to file
   */
  private async saveTokens(tokens: any): Promise<void> {
    try {
      await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2));
      console.log('💾 Calendar tokens saved successfully');
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  /**
   * Load tokens from file
   */
  private async loadTokens(): Promise<void> {
    try {
      const tokensData = await fs.readFile(this.tokensPath, 'utf-8');
      const tokens = JSON.parse(tokensData);
      
      this.oauth2Client.setCredentials(tokens);
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.isAuthenticated = true;
      
      console.log('✅ Calendar tokens loaded successfully');
    } catch (error) {
      throw new Error('No tokens found');
    }
  }

  /**
   * Check if authenticated
   */
  isAuth(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get upcoming events
   */
  async getEvents(
    maxResults: number = 50,
    timeMin?: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: process.env.CALENDAR_ID || 'primary',
        timeMin: (timeMin || new Date()).toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Get events within a time range
   */
  async getEventsBetween(
    startTime: Date,
    endTime: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: process.env.CALENDAR_ID || 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error fetching events in range:', error);
      throw new Error('Failed to fetch events in time range');
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    summary: string,
    startTime: Date,
    endTime: Date,
    description?: string
  ): Promise<calendar_v3.Schema$Event> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      const event: calendar_v3.Schema$Event = {
        summary,
        description: description || `Created by Tempora at ${new Date().toISOString()}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York'
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.CALENDAR_ID || 'primary',
        requestBody: event
      });

      console.log(`✅ Created calendar event: ${summary}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<calendar_v3.Schema$Event>
  ): Promise<calendar_v3.Schema$Event> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      // First, get the existing event
      const existing = await this.calendar.events.get({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });

      // Merge updates with existing data
      const updatedEvent = {
        ...existing.data,
        ...updates
      };

      // Update the event
      const response = await this.calendar.events.update({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId,
        requestBody: updatedEvent
      });

      console.log(`✅ Updated calendar event: ${eventId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      await this.calendar.events.delete({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });

      console.log(`✅ Deleted calendar event: ${eventId}`);
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Append text to event description
   */
  async appendToDescription(eventId: string, additionalText: string): Promise<void> {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }

    try {
      // Get existing event
      const event = await this.calendar.events.get({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });

      // Append to description
      const currentDescription = event.data.description || '';
      const newDescription = `${currentDescription}\n\n${additionalText}`;

      // Update event
      await this.updateEvent(eventId, { description: newDescription });
      
      console.log(`✅ Appended to event description: ${eventId}`);
    } catch (error) {
      console.error('❌ Error appending to event description:', error);
      throw new Error('Failed to append to event description');
    }
  }
}

export default CalendarService;
```

> Tokens are cached at `backend/tokens/calendar.tokens.json`. This folder is git-ignored so you can safely authenticate locally without leaking credentials.

## 🛣️ Step 4: Create Auth Routes

Create `backend/src/routes/calendar.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import CalendarService from '../services/calendar/CalendarService';

const router = Router();
const calendarService = new CalendarService();

/**
 * GET /api/calendar/auth
 * Returns the Google OAuth authorization URL
 */
router.get('/auth', (req: Request, res: Response) => {
  try {
    if (calendarService.isAuth()) {
      return res.json({
        success: true,
        message: 'Already authenticated with Google Calendar',
        authenticated: true
      });
    }

    const authUrl = calendarService.getAuthUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Please visit the authUrl to authenticate'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
});

/**
 * GET /api/calendar/callback
 * OAuth callback endpoint - exchanges code for tokens
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Authorization code is required'
    });
  }

  try {
    await calendarService.getAccessToken(code);
    
    res.json({
      success: true,
      message: 'Successfully authenticated with Google Calendar!',
      redirect: 'http://localhost:3000/dashboard'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google Calendar'
    });
  }
});

/**
 * GET /api/calendar/events
 * Get upcoming calendar events
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    if (!calendarService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google Calendar',
        authUrl: calendarService.getAuthUrl()
      });
    }

    const maxResults = parseInt(req.query.maxResults as string) || 50;
    const events = await calendarService.getEvents(maxResults);

    res.json({
      success: true,
      count: events.length,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        htmlLink: event.htmlLink
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calendar events'
    });
  }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    if (!calendarService.isAuth()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google Calendar'
      });
    }

    const { summary, startTime, endTime, description } = req.body;

    if (!summary || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'summary, startTime, and endTime are required'
      });
    }

    const event = await calendarService.createEvent(
      summary,
      new Date(startTime),
      new Date(endTime),
      description
    );

    res.json({
      success: true,
      message: 'Calendar event created successfully',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create calendar event'
    });
  }
});

/**
 * GET /api/calendar/status
 * Check calendar authentication status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    authenticated: calendarService.isAuth(),
    message: calendarService.isAuth() 
      ? 'Authenticated with Google Calendar' 
      : 'Not authenticated - please visit /api/calendar/auth'
  });
});

export { router as calendarRouter, calendarService };
```

## 🔌 Step 5: Integrate Routes with Server

Update `backend/src/server.ts` to include calendar routes:

```typescript
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import { calendarRouter } from './routes/calendar.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Create logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'tempora-backend' },
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Tempora Backend',
    version: '1.0.0',
    network: process.env.SOMNIA_NETWORK || 'testnet'
  });
});

// Calendar routes
app.use('/api/calendar', calendarRouter);

// Redirect /auth to /api/calendar/auth for convenience
app.get('/auth', (req: Request, res: Response) => {
  res.redirect('/api/calendar/auth');
});

// API status
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'Tempora API is running',
    endpoints: {
      health: '/health',
      calendarAuth: '/api/calendar/auth',
      calendarCallback: '/api/calendar/callback',
      calendarEvents: '/api/calendar/events',
      calendarStatus: '/api/calendar/status'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Tempora backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Network: ${process.env.SOMNIA_NETWORK || 'testnet'}`);
  logger.info(`📅 Calendar polling interval: ${process.env.CALENDAR_POLL_INTERVAL || 30}s`);
  logger.info(`💡 Health check: http://localhost:${PORT}/health`);
  logger.info(`📅 Calendar auth: http://localhost:${PORT}/api/calendar/auth`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
```

## 🧪 Step 6: Test Calendar Integration

### Start the Backend

```bash
cd tempora/backend
npm run dev
```

### Test Authentication Flow

1. **Check calendar status:**
```bash
curl http://localhost:3001/api/calendar/status
```

Expected response:
```json
{
  "success": true,
  "authenticated": false,
  "message": "Not authenticated - please visit /api/calendar/auth"
}
```

2. **Get auth URL:**
```bash
curl http://localhost:3001/api/calendar/auth
```

Expected response:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Please visit the authUrl to authenticate"
}
```

3. **Visit the auth URL in your browser:**
   - Copy the `authUrl` from the response
   - Paste it in your browser
   - Sign in with your Google account
   - Allow Tempora to access your calendar
   - You'll be redirected to the callback URL
   - You should see a success message

4. **Verify authentication:**
```bash
curl http://localhost:3001/api/calendar/status
```

Expected response:
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authenticated with Google Calendar"
}
```

### Test Event Operations

1. **Get existing events:**
```bash
curl http://localhost:3001/api/calendar/events
```

2. **Create a test event:**
```bash
curl -X POST http://localhost:3001/api/calendar/events \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event from Tempora",
    "startTime": "2024-12-20T14:00:00Z",
    "endTime": "2024-12-20T15:00:00Z",
    "description": "This is a test event created via Tempora API"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Calendar event created successfully",
  "event": {
    "id": "abc123xyz",
    "summary": "Test Event from Tempora",
    "htmlLink": "https://calendar.google.com/calendar/event?eid=..."
  }
}
```

3. **Verify in Google Calendar:**
   - Go to [Google Calendar](https://calendar.google.com)
   - You should see the "Test Event from Tempora" on Dec 20, 2024

## 🎉 What You've Built

Congratulations! You now have:

✅ Google Cloud project configured
✅ Calendar API enabled
✅ OAuth 2.0 authentication working
✅ CalendarService with full CRUD operations
✅ Auth routes implemented
✅ Token persistence (stored in `tokens.json`)
✅ Event reading and writing capabilities

## 📁 New Files Created

```
backend/
├── src/
│   ├── services/
│   │   └── calendar/
│   │       └── CalendarService.ts ✅ (350+ lines)
│   ├── routes/
│   │   └── calendar.routes.ts ✅ (180+ lines)
│   └── server.ts ✅ (updated)
└── tokens.json ✅ (auto-created after auth)
```

## 🐛 Common Issues & Solutions

### Issue: "redirect_uri_mismatch" error
**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Ensure redirect URI exactly matches: `http://localhost:3001/api/calendar/callback`
4. No trailing slash, port must match

### Issue: "Access blocked: This app's request is invalid"
**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Add your email to "Test users"
3. Or publish the app (for production)

### Issue: Tokens not persisting
**Solution:**
```bash
# Check file permissions
ls -la backend/tokens.json

# If file doesn't exist, it will be created on first auth
# Ensure backend has write permissions in its directory
```

### Issue: "Calendar not initialized" error
**Solution:**
You need to authenticate first:
```bash
# Visit this URL in browser
http://localhost:3001/api/calendar/auth

# Follow OAuth flow
# Then tokens will be saved and calendar will be initialized
```

## 📝 Key Concepts Explained

### OAuth 2.0 Flow
1. **User clicks auth link** → Redirects to Google
2. **User grants permission** → Google returns auth code
3. **Backend exchanges code** → Gets access + refresh tokens
4. **Tokens saved to file** → Used for subsequent API calls
5. **Access token expires** → Refresh token gets new access token

### Token Types
- **Access Token**: Short-lived (1 hour), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens
- Both stored in `tokens.json`

### Calendar Scopes
- `calendar`: Full calendar access (read/write)
- `calendar.events`: Events only (what we use)

## 📖 Next Steps

In the next chunk, you'll:
1. Set up Somnia testnet connection
2. Create deterministic wallet service with Viem
3. Implement wallet generation from calendar ID
4. Add faucet integration for testnet tokens
5. Test wallet operations

**Continue to:** [Chunk 3: Somnia Wallet Service →](03-somnia-wallet-service.md)

---

**Questions or Issues?** Check the troubleshooting section or open an issue on GitHub.

