import ApiError from '../utils/ApiError.js';

function authorizeRoles(...roles) {
  return (request, _response, next) => {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(request.user.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };
}

export default authorizeRoles;
