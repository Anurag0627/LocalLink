import { env } from '../config/env.js';

export const refreshCookiePath = '/api/v1/auth';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: refreshCookiePath,
  };
}

export function setRefreshCookie(response, token) {
  response.cookie(env.COOKIE_NAME, token, {
    ...refreshCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(response) {
  response.clearCookie(env.COOKIE_NAME, refreshCookieOptions());
}
