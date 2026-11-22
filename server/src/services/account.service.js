import argon2 from 'argon2';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as refreshSessionRepository from '../repositories/refreshSession.repository.js';
import ApiError from '../utils/ApiError.js';
import { isTransactionUnsupported } from '../utils/mongo.utils.js';
import { requireAuthenticatedUser } from '../utils/authorization.utils.js';

const accountFields = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'role',
  'status',
  'isEmailVerified',
  'createdAt',
  'lastLoginAt',
];

function serializeAccount(user) {
  return Object.fromEntries(
    accountFields.map((field) => [field, user[field] ?? null]),
  );
}

export async function getAccount(authenticatedUser) {
  requireAuthenticatedUser(authenticatedUser);
  const user = await accountRepository.findById(authenticatedUser._id);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }
  return serializeAccount(user);
}

export async function updateAccount(authenticatedUser, data) {
  requireAuthenticatedUser(authenticatedUser);
  const userId = authenticatedUser._id;
  const user = await accountRepository.updatePersonalInformation(userId, data);
  if (!user) {
    throw new ApiError(404, 'Account not found');
  }
  return serializeAccount(user);
}

export async function changePassword(authenticatedUser, { currentPassword, newPassword }) {
  requireAuthenticatedUser(authenticatedUser);
  const userId = authenticatedUser._id;
  const user = await accountRepository.findByIdWithPassword(userId);
  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Authentication required');
  }

  if (!(await argon2.verify(user.password, currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  if (await argon2.verify(user.password, newPassword)) {
    throw new ApiError(400, 'New password must differ from the current password');
  }

  const newPasswordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });
  const changedAt = new Date();
  const session = await mongoose.startSession();
  let useFallback = false;

  try {
    await session.withTransaction(async () => {
      const result = await accountRepository.updatePasswordIfCurrent({
        userId,
        currentPasswordHash: user.password,
        currentAuthVersion: user.authVersion,
        newPasswordHash,
        session,
      });

      if (result.matchedCount !== 1) {
        throw new ApiError(409, 'Password changed concurrently; please sign in again');
      }

      await refreshSessionRepository.revokeAllForUser(userId, changedAt, session);
    });
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }

    useFallback = true;
    logger.info('MongoDB transactions are unavailable; using password update fallback');
  } finally {
    await session.endSession();
  }

  if (useFallback) {
    const result = await accountRepository.updatePasswordIfCurrent({
      userId,
      currentPasswordHash: user.password,
      currentAuthVersion: user.authVersion,
      newPasswordHash,
    });

    if (result.matchedCount !== 1) {
      throw new ApiError(409, 'Password changed concurrently; please sign in again');
    }

    try {
      await refreshSessionRepository.revokeAllForUser(userId, changedAt);
    } catch (error) {
      logger.error(
        { errorName: error.name },
        'Refresh sessions could not be marked revoked after a password change',
      );
      throw new ApiError(
        503,
        'Password changed, but session cleanup failed; sign in again to continue',
        undefined,
        { isOperational: true },
      );
    }
  }

  return { changedAt };
}
