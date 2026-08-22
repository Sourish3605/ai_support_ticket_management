import axios from 'axios';

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl += '/api';
    }
    return cleanUrl;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
  }
  return 'https://ai-support-ticket-management.onrender.com/api';
};

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    try {
      const tokenData = localStorage.getItem('supportpilot-tokens');
      if (tokenData) {
        const tokens = JSON.parse(tokenData);
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
      }
    } catch (err) {
      console.warn('Could not parse auth tokens for request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle token expiration with silent refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/token/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokenData = localStorage.getItem('supportpilot-tokens');
        const tokens = tokenData ? JSON.parse(tokenData) : null;

        if (tokens?.refresh) {
          const refreshRes = await axios.post(`${resolveBaseUrl()}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });

          const newAccess = refreshRes.data?.access;
          if (newAccess) {
            tokens.access = newAccess;
            localStorage.setItem('supportpilot-tokens', JSON.stringify(tokens));
            api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Refresh token failed -> clear stale credentials
        localStorage.removeItem('supportpilot-user');
        localStorage.removeItem('supportpilot-tokens');
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
