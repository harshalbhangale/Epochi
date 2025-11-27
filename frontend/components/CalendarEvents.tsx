'use client';

import { useEffect, useState } from 'react';
import { Calendar, ExternalLink, RefreshCw, Plus, CheckCircle } from 'lucide-react';
import { calendarApi } from '@/lib/api';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  status: string;
  htmlLink: string;
}

export default function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchEvents = async () => {
    try {
      const statusRes = await calendarApi.getStatus();
      setAuthenticated(statusRes.data.authenticated);
      
      if (statusRes.data.authenticated) {
        const eventsRes = await calendarApi.getEvents(10);
        setEvents(eventsRes.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const isTransactionEvent = (title: string): boolean => {
    const patterns = [
      /send\s+\d+\.?\d*\s+\w+\s+to\s+0x/i,
      /transfer\s+\d+\.?\d*\s+\w+\s+to\s+0x/i,
      /swap\s+\d+\.?\d*\s+\w+\s+(to|for)/i,
    ];
    return patterns.some(p => p.test(title));
  };

  const isExecuted = (description?: string): boolean => {
    return description?.includes('✅ Transaction Executed') || false;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Google Calendar</h3>
          <p className="text-gray-500 text-sm mb-4">
            Authenticate to start scheduling transactions
          </p>
          <a
            href="http://localhost:3001/api/calendar/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
          >
            <Calendar size={18} />
            Connect Calendar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-xl">
            <Calendar size={20} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Calendar Events</h3>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Open Google Calendar"
          >
            <Plus size={18} className="text-gray-500" />
          </a>
          <button
            onClick={fetchEvents}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {events.map((event) => {
            const isTx = isTransactionEvent(event.summary || '');
            const executed = isExecuted(event.description);
            
            return (
              <div
                key={event.id}
                className={`rounded-xl p-3 border transition-all ${
                  executed
                    ? 'bg-emerald-50 border-emerald-200'
                    : isTx
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {executed && <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />}
                      <p className={`font-medium truncate ${
                        executed ? 'text-emerald-700' : isTx ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        {event.summary || 'No title'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.start).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-white/50 rounded-lg flex-shrink-0"
                  >
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

