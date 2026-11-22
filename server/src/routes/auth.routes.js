import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import requireTrustedOrigin from '../middlewares/trustedOrigin.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { loginSchema, registrationSchema } from '../validators/auth.validator.js';
import ApiError from '../utils/ApiError.js';

const authRoutes = Router();

function createAuthRateLimit(limit, windowMs) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_request, _response, next) {
      next(new ApiError(429, 'Too many authentication attempts; try again later'));
    },
  });
}

const registrationRateLimit = createAuthRateLimit(5, 60 * 60 * 1000);
const loginRateLimit = createAuthRateLimit(10, 15 * 60 * 1000);
const refreshRateLimit = createAuthRateLimit(30, 15 * 60 * 1000);

authRoutes.post(
  '/register',
  requireTrustedOrigin,
  registrationRateLimit,
  validate(registrationSchema),
  authController.register,
);
authRoutes.post(
  '/login',
  requireTrustedOrigin,
  loginRateLimit,
  validate(loginSchema),
  authController.login,
);
authRoutes.post(
  '/refresh',
  requireTrustedOrigin,
  refreshRateLimit,
  authController.refresh,
);
authRoutes.post(
  '/logout',
  requireTrustedOrigin,
  authController.logout,
);
authRoutes.post(
  '/logout-all',
  authenticate,
  requireTrustedOrigin,
  authController.logoutAll,
);
authRoutes.get('/me', authenticate, authController.getMe);

export default authRoutes;
