import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import errorMiddleware from './middlewares/error.middleware.js';
import notFound from './middlewares/notFound.middleware.js';
import requestLogger from './middlewares/requestLogger.middleware.js';
import apiRoutes, { legacyApiRoutes } from './routes/index.routes.js';
import ApiError from './utils/ApiError.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CLIENT_URL.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, 'Origin is not allowed'));
    },
  }),
);
app.use(requestLogger);
app.use(cookieParser());
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_request, _response, next) {
      next(new ApiError(429, 'Too many requests, please try again later'));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use('/api/v1', apiRoutes);
app.use('/api', legacyApiRoutes);

app.use(notFound);
app.use(errorMiddleware);

export default app;
