import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

function requireTrustedOrigin(request, _response, next) {
  const origin = request.get('origin');

  if (!origin || !env.CLIENT_URL.includes(origin)) {
    return next(new ApiError(403, 'Request origin is not allowed'));
  }

  return next();
}

export default requireTrustedOrigin;
