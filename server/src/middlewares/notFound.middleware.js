import ApiError from '../utils/ApiError.js';

function notFound(_request, _response, next) {
  next(new ApiError(404, 'Resource not found'));
}

export default notFound;
