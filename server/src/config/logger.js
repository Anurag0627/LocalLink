import pino from 'pino';
import { env } from './env.js';

const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.set-cookie',
      'MONGODB_URI',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
