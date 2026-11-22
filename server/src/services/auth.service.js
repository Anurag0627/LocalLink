import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import * as authRepository from '../repositories/auth.repository.js';
import * as refreshSessionRepository from '../repositories/refreshSession.repository.js';
import ApiError from '../utils/ApiError.js';
import { isTransactionUnsupported } from '../utils/mongo.utils.js';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from './token.service.js';

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function isDuplicateEmailError(error) {
  return error.code === 11000
    && (error.keyPattern?.email || Object.hasOwn(error.keyValue || {}, 'email'));
}

function createRefreshSessionData(
  userId,
  authVersion,
  tokenHash,
  familyId,
  metadata = {},
) {
  const sessionData = {
    authVersion: authVersion ?? 0,
    tokenHash,
    familyId,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * dayInMilliseconds),
    userAgent: metadata.userAgent?.slice(0, 512),
    ipAddress: metadata.ipAddress?.slice(0, 128),
  };

  if (userId) {
    sessionData.user = userId;
  }

  return sessionData;
}

async function removeUnusedRefreshSession(tokenHash) {
  try {
    await refreshSessionRepository.deleteByTokenHash(tokenHash);
  } catch (error) {
    logger.error(
      { errorName: error.name },
      'Failed to remove an unused refresh session',
    );
  }
}

async function createRoleProfile(userId, role, data, session) {
  if (role === 'CUSTOMER') {
    return authRepository.createCustomerProfile({ user: userId }, session);
  }

  return authRepository.createProviderProfile(
    {
      user: userId,
      businessName: data.businessName,
      description: data.description,
      experienceYears: data.experienceYears,
      verificationStatus: 'PENDING',
    },
    session,
  );
}

async function rollbackPartialRegistration(user, role, tokenHash) {
  const cleanupOperations = [
    () => refreshSessionRepository.deleteByTokenHash(tokenHash),
    () => authRepository.deleteProfileForUser(user._id, role),
    () => authRepository.deleteUserById(user._id),
  ];
  let rollbackFailed = false;

  for (const cleanup of cleanupOperations) {
    try {
      await cleanup();
    } catch (error) {
      rollbackFailed = true;
      logger.error(
        { errorName: error.name },
        'Account registration rollback step failed',
      );
    }
  }

  if (rollbackFailed) {
    throw new ApiError(
      500,
      'Account registration failed and cleanup was incomplete',
      undefined,
      { isOperational: false },
    );
  }
}

async function createRegistrationWithoutTransaction({
  userData,
  role,
  profileData,
  sessionData,
}) {
  let user;

  try {
    user = await authRepository.createUser(userData);
    await createRoleProfile(user._id, role, profileData);
    await refreshSessionRepository.createRefreshSession({
      ...sessionData,
      user: user._id,
    });
    return user;
  } catch (error) {
    if (user) {
      await rollbackPartialRegistration(user, role, sessionData.tokenHash);
    }
    throw error;
  }
}

async function createRegistrationRecords({
  userData,
  role,
  profileData,
  sessionData,
}) {
  const session = await mongoose.startSession();
  let user;
  let useRollback = false;

  try {
    await session.withTransaction(async () => {
      user = await authRepository.createUser(userData, session);
      await createRoleProfile(user._id, role, profileData, session);
      await refreshSessionRepository.createRefreshSession(
        { ...sessionData, user: user._id },
        session,
      );
    });
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }

    useRollback = true;
    logger.info('MongoDB transactions are unavailable; using registration rollback');
  } finally {
    await session.endSession();
  }

  if (useRollback) {
    return createRegistrationWithoutTransaction({
      userData,
      role,
      profileData,
      sessionData,
    });
  }

  return user;
}

export async function register(data, metadata) {
  const existingUser = await authRepository.findUserByEmail(data.email);

  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
  });
  const refreshToken = createRefreshToken();
  const familyId = randomUUID();
  const sessionData = createRefreshSessionData(
    undefined,
    0,
    refreshToken.tokenHash,
    familyId,
    metadata,
  );
  const userData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: passwordHash,
    role: data.role,
  };

  try {
    const user = await createRegistrationRecords({
      userData,
      role: data.role,
      profileData: data,
      sessionData,
    });

    return {
      user,
      accessToken: createAccessToken(user),
      refreshToken: refreshToken.token,
    };
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

export async function login({ email, password }, metadata) {
  const user = await authRepository.findUserByEmail(email, { includePassword: true });

  if (!user || !(await argon2.verify(user.password, password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, 'Account is not active');
  }

  const updatedUser = await authRepository.updateLastLogin(
    user._id,
    new Date(),
    user.password,
    user.authVersion,
  );
  if (!updatedUser || updatedUser.status !== 'ACTIVE') {
    throw new ApiError(403, 'Account is not active');
  }

  const accessToken = createAccessToken(updatedUser);
  const refreshToken = createRefreshToken();

  await refreshSessionRepository.createRefreshSession(
    createRefreshSessionData(
      user._id,
      updatedUser.authVersion,
      refreshToken.tokenHash,
      randomUUID(),
      metadata,
    ),
  );

  const latestUser = await authRepository.findUserById(user._id);
  if (
    !latestUser
    || latestUser.status !== 'ACTIVE'
    || latestUser.authVersion !== updatedUser.authVersion
  ) {
    await removeUnusedRefreshSession(refreshToken.tokenHash);
    throw new ApiError(401, 'Account credentials changed; please sign in again');
  }

  return {
    user: updatedUser,
    accessToken,
    refreshToken: refreshToken.token,
  };
}

export async function refresh(rawToken, metadata) {
  if (typeof rawToken !== 'string' || rawToken.length > 256) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashRefreshToken(rawToken);
  const currentSession = await refreshSessionRepository.findByTokenHash(tokenHash);

  if (!currentSession) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (currentSession.revokedAt) {
    await refreshSessionRepository.revokeFamily(currentSession.familyId, new Date());
    logger.warn('Revoked refresh token reuse detected; session family revoked');
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const now = new Date();
  if (currentSession.expiresAt <= now) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await authRepository.findUserById(currentSession.user);
  if (!user || user.status !== 'ACTIVE') {
    await refreshSessionRepository.revokeFamily(currentSession.familyId, now);
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if ((currentSession.authVersion ?? 0) !== (user.authVersion ?? 0)) {
    await refreshSessionRepository.revokeFamily(currentSession.familyId, now);
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const replacementToken = createRefreshToken();
  const accessToken = createAccessToken(user);

  await refreshSessionRepository.createRefreshSession(
    createRefreshSessionData(
      user._id,
      user.authVersion,
      replacementToken.tokenHash,
      currentSession.familyId,
      metadata,
    ),
  );

  let rotatedSession;
  try {
    rotatedSession = await refreshSessionRepository.replaceActiveToken({
      sessionId: currentSession._id,
      tokenHash,
      replacementTokenHash: replacementToken.tokenHash,
      now,
    });
  } catch (error) {
    await removeUnusedRefreshSession(replacementToken.tokenHash);
    throw error;
  }

  if (!rotatedSession) {
    await removeUnusedRefreshSession(replacementToken.tokenHash);
    const latestSession = await refreshSessionRepository.findByTokenHash(tokenHash);
    if (latestSession?.revokedAt) {
      await refreshSessionRepository.revokeFamily(latestSession.familyId, now);
      logger.warn('Concurrent refresh token reuse detected; session family revoked');
    }
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  return {
    user,
    accessToken,
    refreshToken: replacementToken.token,
  };
}

export async function logout(rawToken) {
  if (typeof rawToken === 'string' && rawToken.length > 0) {
    const session = await refreshSessionRepository.findByTokenHash(
      hashRefreshToken(rawToken),
    );

    if (session) {
      await refreshSessionRepository.revokeFamily(session.familyId, new Date());
    }
  }
}

export async function logoutAll(userId) {
  await refreshSessionRepository.revokeAllForUser(userId, new Date());
}

export async function getProfile(user) {
  return {
    user: user.toJSON(),
    profile: await authRepository.findProfileForUser(user),
  };
}
