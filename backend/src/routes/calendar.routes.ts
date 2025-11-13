import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import CalendarService from '../services/calendar/CalendarService';
import { calendar_v3 } from 'googleapis';

// Load environment variables before instantiating CalendarService
dotenv.config();

const router = Router();
const calendarService = new CalendarService();

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
    return res.json({
      success: true,
      authUrl,
      message: 'Please visit the authUrl to authenticate'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to generate auth URL'
    });
  }
});

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
    return res.json({
      success: true,
      message: 'Successfully authenticated with Google Calendar!',
      redirect: process.env.CALENDAR_POST_AUTH_REDIRECT ?? 'http://localhost:3000'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to authenticate with Google Calendar'
    });
  }
});

router.get('/events', async (req: Request, res: Response) => {
  if (!calendarService.isAuth()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated with Google Calendar',
      authUrl: calendarService.getAuthUrl()
    });
  }

  const maxResults = Number(req.query.maxResults) || 50;

  try {
    const events = await calendarService.getEvents(maxResults);
    return res.json({
      success: true,
      count: events.length,
      events: events.map(formatEventSummary)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to fetch calendar events'
    });
  }
});

router.get('/events/range', async (req: Request, res: Response) => {
  if (!calendarService.isAuth()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated with Google Calendar',
      authUrl: calendarService.getAuthUrl()
    });
  }

  const { start, end } = req.query;
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'start and end query parameters are required ISO date strings'
    });
  }

  try {
    const events = await calendarService.getEventsBetween(new Date(start), new Date(end));
    return res.json({
      success: true,
      count: events.length,
      events: events.map(formatEventSummary)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to fetch calendar events in range'
    });
  }
});

router.post('/events', async (req: Request, res: Response) => {
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

  try {
    const event = await calendarService.createEvent(
      summary,
      new Date(startTime),
      new Date(endTime),
      description
    );
    return res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      event: formatEventSummary(event)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to create calendar event'
    });
  }
});

router.patch('/events/:id', async (req: Request, res: Response) => {
  if (!calendarService.isAuth()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated with Google Calendar'
    });
  }

  const { id } = req.params;
  const updates = req.body as Partial<calendar_v3.Schema$Event>;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Event id is required'
    });
  }

  try {
    const event = await calendarService.updateEvent(id, updates);
    return res.json({
      success: true,
      message: 'Calendar event updated successfully',
      event: formatEventSummary(event)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to update calendar event'
    });
  }
});

router.delete('/events/:id', async (req: Request, res: Response) => {
  if (!calendarService.isAuth()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated with Google Calendar'
    });
  }

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Event id is required'
    });
  }

  try {
    await calendarService.deleteEvent(id);
    return res.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to delete calendar event'
    });
  }
});

router.post('/events/:id/append', async (req: Request, res: Response) => {
  if (!calendarService.isAuth()) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated with Google Calendar'
    });
  }

  const { id } = req.params;
  const { text } = req.body;

  if (!id || !text) {
    return res.status(400).json({
      success: false,
      error: 'Event id and text are required'
    });
  }

  try {
    await calendarService.appendToDescription(id, text);
    return res.json({
      success: true,
      message: 'Appended to calendar event description'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Failed to append to description'
    });
  }
});

router.get('/status', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    authenticated: calendarService.isAuth(),
    message: calendarService.isAuth()
      ? 'Authenticated with Google Calendar'
      : 'Not authenticated - please visit /api/calendar/auth'
  });
});

function formatEventSummary(event: calendar_v3.Schema$Event) {
  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime ?? event.start?.date,
    end: event.end?.dateTime ?? event.end?.date,
    status: event.status,
    htmlLink: event.htmlLink
  };
}

export { router as calendarRouter, calendarService };


