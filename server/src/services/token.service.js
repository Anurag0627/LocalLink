import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function createAccessToken(user) {
  return jwt.sign(
    { role: user.role, ver: user.authVersion ?? 0 },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      audience: env.ACCESS_TOKEN_AUDIENCE,
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      issuer: env.ACCESS_TOKEN_ISSUER,
      subject: user._id.toString(),
    },
  );
}

export function verifyAccessToken(token) {
  try {
    const claims = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      audience: env.ACCESS_TOKEN_AUDIENCE,
      issuer: env.ACCESS_TOKEN_ISSUER,
    });

    if (typeof claims === 'string' || typeof claims.sub !== 'string') {
      throw new ApiError(401, 'Invalid or expired access token');
    }

    return claims;
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }
}

export function createRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  return { token, tokenHash };
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
