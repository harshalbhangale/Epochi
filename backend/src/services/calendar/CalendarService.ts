import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from 'winston';

export interface CalendarServiceOptions {
  tokensFilePath?: string;
  logger?: Logger;
}

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * CalendarService encapsulates Google Calendar OAuth and CRUD helpers.
 */
export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;
  private tokensPath: string;
  private isAuthenticated = false;
  private logger?: Logger;

  constructor(options: CalendarServiceOptions = {}) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Missing Google Calendar environment variables (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.tokensPath =
      options.tokensFilePath ??
      path.join(process.cwd(), 'tokens', 'calendar.tokens.json');

    this.logger = options.logger;

    this.initFromStoredTokens().catch(() => {
      this.logger?.info('No existing calendar tokens found. Authentication required.');
    });
  }

  /**
   * Returns an authorization URL for initiating OAuth flow.
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: DEFAULT_SCOPES,
      prompt: 'consent'
    });
  }

  /**
   * Exchanges authorization code for tokens and persists them.
   */
  async getAccessToken(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.setAndPersistTokens(tokens);
      this.logger?.info('Calendar authentication successful.');
    } catch (error) {
      this.logger?.error('Error getting access token', { error });
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Reads cached tokens from disk if available.
   */
  private async initFromStoredTokens(): Promise<void> {
    try {
      const file = await fs.readFile(this.tokensPath, 'utf-8');
      const tokens = JSON.parse(file) as Credentials;
      await this.setAndPersistTokens(tokens, false);
      this.logger?.info('Calendar tokens loaded successfully.');
    } catch (error) {
      throw error;
    }
  }

  private async setAndPersistTokens(tokens: Credentials, persist = true): Promise<void> {
    this.oauth2Client.setCredentials(tokens);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.isAuthenticated = true;

    if (persist) {
      await this.persistTokens(tokens);
    }
  }

  private async persistTokens(tokens: Credentials): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.tokensPath), { recursive: true });
      await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2), 'utf-8');
      this.logger?.info('Calendar tokens saved.');
    } catch (error) {
      this.logger?.error('Error saving calendar tokens', { error });
    }
  }

  isAuth(): boolean {
    return this.isAuthenticated;
  }

  async getEvents(maxResults = 50, timeMin?: Date): Promise<calendar_v3.Schema$Event[]> {
    this.ensureCalendar();
    try {
      const response = await this.calendar!.events.list({
        calendarId: process.env.CALENDAR_ID || 'primary',
        timeMin: (timeMin ?? new Date()).toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });
      return response.data.items ?? [];
    } catch (error) {
      this.logger?.error('Error fetching calendar events', { error });
      throw new Error('Failed to fetch calendar events');
    }
  }

  async getEventsBetween(startTime: Date, endTime: Date): Promise<calendar_v3.Schema$Event[]> {
    this.ensureCalendar();
    try {
      const response = await this.calendar!.events.list({
        calendarId: process.env.CALENDAR_ID || 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      return response.data.items ?? [];
    } catch (error) {
      this.logger?.error('Error fetching events in range', { error });
      throw new Error('Failed to fetch events in range');
    }
  }

  async createEvent(
    summary: string,
    startTime: Date,
    endTime: Date,
    description?: string
  ): Promise<calendar_v3.Schema$Event> {
    this.ensureCalendar();
    try {
      const event: calendar_v3.Schema$Event = {
        summary,
        description: description ?? `Created by Epochi at ${new Date().toISOString()}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: process.env.CALENDAR_TIMEZONE ?? 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: process.env.CALENDAR_TIMEZONE ?? 'UTC'
        }
      };

      const response = await this.calendar!.events.insert({
        calendarId: process.env.CALENDAR_ID || 'primary',
        requestBody: event
      });
      this.logger?.info('Created calendar event', { eventId: response.data.id, summary });
      return response.data;
    } catch (error) {
      this.logger?.error('Error creating calendar event', { error });
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(eventId: string, updates: Partial<calendar_v3.Schema$Event>): Promise<calendar_v3.Schema$Event> {
    this.ensureCalendar();
    try {
      const existing = await this.calendar!.events.get({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });

      const response = await this.calendar!.events.update({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId,
        requestBody: {
          ...existing.data,
          ...updates
        }
      });

      this.logger?.info('Updated calendar event', { eventId });
      return response.data;
    } catch (error) {
      this.logger?.error('Error updating calendar event', { error });
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.ensureCalendar();
    try {
      await this.calendar!.events.delete({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });
      this.logger?.info('Deleted calendar event', { eventId });
    } catch (error) {
      this.logger?.error('Error deleting calendar event', { error });
      throw new Error('Failed to delete calendar event');
    }
  }

  async appendToDescription(eventId: string, additionalText: string): Promise<void> {
    this.ensureCalendar();
    try {
      const event = await this.calendar!.events.get({
        calendarId: process.env.CALENDAR_ID || 'primary',
        eventId
      });
      const currentDescription = event.data.description ?? '';
      const newDescription = `${currentDescription}\n\n${additionalText}`.trim();
      await this.updateEvent(eventId, { description: newDescription });
    } catch (error) {
      this.logger?.error('Error appending to event description', { error });
      throw new Error('Failed to append to event description');
    }
  }

  private ensureCalendar(): void {
    if (!this.calendar) {
      throw new Error('Calendar not initialized. Please authenticate first.');
    }
  }
}

export default CalendarService;


