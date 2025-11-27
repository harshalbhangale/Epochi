import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const calendarApi = {
  getStatus: () => api.get('/api/calendar/status'),
  getAuthUrl: () => api.get('/api/calendar/auth'),
  getEvents: (maxResults = 50) => api.get(`/api/calendar/events?maxResults=${maxResults}`),
  createEvent: (data: { summary: string; startTime: string; endTime: string; description?: string }) =>
    api.post('/api/calendar/events', data),
};

export const walletApi = {
  getWalletInfo: (calendarId: string) => api.get(`/api/wallet/${calendarId}`),
  getNetworkStatus: () => api.get('/api/wallet/network/status'),
};

export const streamsApi = {
  getTransactions: (publisherAddress: string) =>
    api.get(`/api/streams/transactions/${publisherAddress}`),
  getSchema: () => api.get('/api/streams/schema'),
  getPublisher: () => api.get('/api/streams/publisher'),
};

export const agentApi = {
  getStatus: () => api.get('/api/agent/status'),
  getQueue: () => api.get('/api/agent/queue'),
  start: () => api.post('/api/agent/start'),
  stop: () => api.post('/api/agent/stop'),
  clearCache: () => api.post('/api/agent/clear-cache'),
};

export default api;

