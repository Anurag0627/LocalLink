import mongoose from 'mongoose';
import asyncHandler from './asyncHandler.middleware.js';
import * as authRepository from '../repositories/auth.repository.js';
import { verifyAccessToken } from '../services/token.service.js';
import ApiError from '../utils/ApiError.js';

const authenticate = asyncHandler(async (request, _response, next) => {
  const authorization = request.get('authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);

  if (!match) {
    throw new ApiError(401, 'Authentication required');
  }

  const claims = verifyAccessToken(match[1]);
  if (!mongoose.isValidObjectId(claims.sub)) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await authRepository.findUserById(claims.sub);
  if (
    !user
    || user.status !== 'ACTIVE'
    || (claims.ver ?? 0) !== (user.authVersion ?? 0)
  ) {
    throw new ApiError(401, 'Invalid or inactive account');
  }

  request.user = user;
  return next();
});

export default authenticate;
