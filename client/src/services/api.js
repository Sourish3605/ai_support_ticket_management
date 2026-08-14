import axios from 'axios';

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    return '/api';
  }
  return import.meta.env.VITE_API_URL || 'https://ai-support-ticket-management.onrender.com/api';
};

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
