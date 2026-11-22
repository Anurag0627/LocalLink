import { env } from '../config/env.js';
import { isDatabaseConnected } from '../config/database.js';
import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import ApiResponse from '../utils/ApiResponse.js';

function getHealthData() {
  const databaseConnected = isDatabaseConnected();

  return {
    databaseConnected,
    data: {
      status: databaseConnected ? 'healthy' : 'unhealthy',
      environment: env.NODE_ENV,
      database: {
        status: databaseConnected ? 'connected' : 'disconnected',
      },
    },
  };
}

export const getHealth = asyncHandler((_request, response) => {
  const health = getHealthData();

  if (!health.databaseConnected) {
    return response.status(503).json({
      success: false,
      message: 'LocalLink API is temporarily unavailable',
      data: health.data,
      errors: [],
    });
  }

  return new ApiResponse(200, 'LocalLink API is running', health.data).send(response);
});

export const getLegacyHealth = asyncHandler((_request, response) => {
  const health = getHealthData();

  if (!health.databaseConnected) {
    return response.status(503).json({
      success: false,
      message: 'LocalLink API is temporarily unavailable',
      environment: env.NODE_ENV,
      database: health.data.database,
      errors: [],
    });
  }

  return response.status(200).json({
    success: true,
    message: 'LocalLink API is running',
    environment: env.NODE_ENV,
    database: health.data.database,
  });
});
