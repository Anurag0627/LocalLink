import logger from '../config/logger.js';

function requestLogger(request, response, next) {
  const startedAt = process.hrtime.bigint();
  const path = request.originalUrl.split('?')[0];

  response.once('finish', () => {
    const statusCode = response.statusCode;
    const log = statusCode >= 500
      ? logger.error.bind(logger)
      : statusCode >= 400
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);

    log(
      {
        method: request.method,
        path,
        requestId: request.requestId,
        statusCode,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
      },
      'HTTP request completed',
    );
  });

  next();
}

export default requestLogger;
