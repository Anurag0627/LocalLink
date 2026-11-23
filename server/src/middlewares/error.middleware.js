import { ZodError } from 'zod';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

function normalizeError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map(({ path, message }) => ({
      path: path.join('.'),
      message,
    }));

    return new ApiError(400, 'Request validation failed', details);
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return new ApiError(400, 'Malformed JSON request');
  }

  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large');
  }

  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map(({ path, message }) => ({
      path,
      message,
    }));

    return new ApiError(400, 'Request validation failed', details);
  }

  if (error.name === 'CastError') {
    return new ApiError(400, 'Invalid request value');
  }

  return new ApiError(500, 'Internal server error', undefined, {
    isOperational: false,
  });
}

function errorMiddleware(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const normalizedError = normalizeError(error);
  const { statusCode, isOperational } = normalizedError;

  const log = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  log(
    {
      errorName: error.name,
      statusCode,
      method: request.method,
      path: request.path,
      requestId: request.requestId,
    },
    isOperational ? 'Request failed' : 'Unexpected request error',
  );

  const message = isOperational ? normalizedError.message : 'Internal server error';
  const errors = Array.isArray(normalizedError.details)
    ? normalizedError.details
    : normalizedError.details === undefined
      ? []
      : [normalizedError.details];

  return response.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export default errorMiddleware;
