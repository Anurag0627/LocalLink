import { env } from '../config/env.js';
import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  clearRefreshCookie,
  setRefreshCookie,
} from '../utils/token.utils.js';

function requestMetadata(request) {
  return {
    userAgent: request.get('user-agent'),
    ipAddress: request.ip,
  };
}

export const register = asyncHandler(async (request, response) => {
  const result = await authService.register(
    request.validatedBody,
    requestMetadata(request),
  );
  setRefreshCookie(response, result.refreshToken);

  return new ApiResponse(201, 'Account registered', {
    user: result.user.toJSON(),
    accessToken: result.accessToken,
  }).send(response);
});

export const login = asyncHandler(async (request, response) => {
  const result = await authService.login(
    request.validatedBody,
    requestMetadata(request),
  );
  setRefreshCookie(response, result.refreshToken);

  return new ApiResponse(200, 'Login successful', {
    user: result.user.toJSON(),
    accessToken: result.accessToken,
  }).send(response);
});

export const refresh = asyncHandler(async (request, response) => {
  try {
    const result = await authService.refresh(
      request.cookies?.[env.COOKIE_NAME],
      requestMetadata(request),
    );
    setRefreshCookie(response, result.refreshToken);

    return new ApiResponse(200, 'Token refreshed', {
      accessToken: result.accessToken,
    }).send(response);
  } catch (error) {
    if (error.statusCode === 401) {
      clearRefreshCookie(response);
    }
    throw error;
  }
});

export const logout = asyncHandler(async (request, response) => {
  await authService.logout(request.cookies?.[env.COOKIE_NAME]);
  clearRefreshCookie(response);

  return new ApiResponse(200, 'Logout successful').send(response);
});

export const logoutAll = asyncHandler(async (request, response) => {
  await authService.logoutAll(request.user._id);
  clearRefreshCookie(response);

  return new ApiResponse(200, 'Logged out from all devices').send(response);
});

export const getMe = asyncHandler(async (request, response) => {
  const profile = await authService.getProfile(request.user);
  return new ApiResponse(200, 'Authenticated user', profile).send(response);
});
