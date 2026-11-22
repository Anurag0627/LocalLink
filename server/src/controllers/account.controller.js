import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as accountService from '../services/account.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { clearRefreshCookie } from '../utils/token.utils.js';

export const getAccount = asyncHandler(async (request, response) => {
  const data = await accountService.getAccount(request.user);
  return new ApiResponse(200, 'Account retrieved', data).send(response);
});

export const updateAccount = asyncHandler(async (request, response) => {
  const data = await accountService.updateAccount(
    request.user,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Account updated successfully', data).send(response);
});

export const changePassword = asyncHandler(async (request, response) => {
  const data = await accountService.changePassword(
    request.user,
    request.validatedBody,
  );
  clearRefreshCookie(response);
  return new ApiResponse(200, 'Password changed successfully; please sign in again', data)
    .send(response);
});
