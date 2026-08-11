import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (
    import.meta.env.PROD
      ? 'https://ai-support-ticket-management.onrender.com/api'
      : 'http://localhost:5000/api'
  ),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});
