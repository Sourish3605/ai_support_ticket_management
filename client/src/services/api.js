import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://ai-support-ticket-management.onrender.com/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});
