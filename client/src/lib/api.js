import axios from 'axios';
import { getApiBaseUrl } from '../config/env.js';

let accessToken;
let refreshPromise;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function clearAccessToken() {
  accessToken = null;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

function shouldRefresh(config) {
  if (!config || config._authRetry) return false;
  if (!config.url) return false;
  if (/\/auth\/(?:login|register|refresh|logout)(?:$|\/)/.test(config.url)) return false;
  return true;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const response = error.response;
    const config = error.config;

    if (!response || response.status !== 401 || !shouldRefresh(config)) {
      throw normalizeApiError(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then((refreshResponse) => {
            const token = refreshResponse.data?.data?.accessToken;
            if (!token) throw new Error('Refresh response did not include an access token');
            setAccessToken(token);
            return token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      config._authRetry = true;
      return api(config);
    } catch (refreshError) {
      clearAccessToken();
      throw normalizeApiError(refreshError);
    }
  },
);

export function normalizeApiError(error) {
  if (
    error
    && typeof error === 'object'
    && typeof error.status === 'number'
    && typeof error.message === 'string'
  ) {
    return error;
  }

  if (error?.response?.data) {
    const payload = error.response.data;
    return {
      status: error.response.status,
      message: payload.message || 'The request could not be completed.',
      details: Array.isArray(payload.errors) ? payload.errors : [],
    };
  }

  if (error?.code === 'ECONNABORTED') {
    return { status: 0, message: 'The request timed out. Please try again.', details: [] };
  }

  return {
    status: 0,
    message: 'Unable to connect to LocalLink. Check your connection.',
    details: [],
  };
}

export default api;
