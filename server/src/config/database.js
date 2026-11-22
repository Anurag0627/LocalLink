import mongoose from 'mongoose';
import { env } from './env.js';
import logger from './logger.js';

const connection = mongoose.connection;

connection.on('connected', () => {
  logger.info('MongoDB connected');
});

connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

connection.on('error', (error) => {
  logger.error({ errorName: error.name }, 'MongoDB connection error');
});

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI);
}

export async function closeDatabase() {
  if (connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isDatabaseConnected() {
  return connection.readyState === 1;
}
