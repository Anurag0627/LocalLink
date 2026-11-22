import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const dateSchema = z.string().regex(/^(\d{4})-(\d{2})-(\d{2})$/, 'Date must use YYYY-MM-DD');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm');

export const createBookingSchema = z.object({
  service: objectIdSchema,
  scheduledDate: dateSchema,
  scheduledTime: timeSchema,
  addressId: objectIdSchema.optional(),
  customerNote: z.string().trim().max(2000).optional(),
}).strict();

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const rejectBookingSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const bookingIdSchema = z.object({ bookingId: objectIdSchema }).strict();

const bookingStatus = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED']);

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: bookingStatus.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  sortBy: z.enum(['createdAt', 'scheduledDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict().refine((data) =>
  data.dateFrom === undefined
  || data.dateTo === undefined
  || data.dateFrom <= data.dateTo,
'dateFrom cannot be after dateTo');

export const providerCalendarQuerySchema = z.object({
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
}).strict().refine((data) =>
  data.dateFrom === undefined
  || data.dateTo === undefined
  || data.dateFrom <= data.dateTo,
'dateFrom cannot be after dateTo');
