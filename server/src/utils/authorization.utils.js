import ApiError from './ApiError.js';

export function requireAuthenticatedUser(user) {
  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Authentication required');
  }
}

export function requireRole(user, role) {
  requireAuthenticatedUser(user);

  if (user.role !== role) {
    throw new ApiError(403, 'You do not have permission to access this resource');
  }
}
