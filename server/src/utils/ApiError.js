class ApiError extends Error {
  constructor(statusCode, message, details, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = options.isOperational ?? statusCode < 500;

    Error.captureStackTrace?.(this, ApiError);
  }
}

export default ApiError;
