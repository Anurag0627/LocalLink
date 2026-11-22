import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';
import { notificationTypes } from '../models/notification.model.js';

export const notificationIdSchema = z.object({
  notificationId: objectIdSchema,
}).strict();

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  unreadOnly: z.enum(['true', 'false']).optional(),
  type: z.enum(notificationTypes).optional(),
}).strict();

export const notificationPreferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  reviewNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
}).strict().refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  'At least one preference field is required',
);
