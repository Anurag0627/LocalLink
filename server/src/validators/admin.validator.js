import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);

export const adminIdParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

export const customerIdParamsSchema = z.object({
  customerId: objectIdSchema,
}).strict();

export const providerIdParamsSchema = z.object({
  providerId: objectIdSchema,
}).strict();

export const serviceIdParamsSchema = z.object({
  serviceId: objectIdSchema,
}).strict();

export const bookingIdParamsSchema = z.object({
  bookingId: objectIdSchema,
}).strict();

export const adminCustomerQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export const adminProviderQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: z.string().trim().max(100).optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  sortBy: z.enum(['createdAt', 'averageRating', 'businessName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export const adminAccountStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
}).strict();

export const verificationSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'REJECTED']),
  reason: z.string().trim().min(1).max(1000).optional(),
}).strict().refine(
  (data) => data.verificationStatus !== 'REJECTED' || data.reason !== undefined,
  { message: 'Rejection reason is required', path: ['reason'] },
);

export const adminServiceQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: z.string().trim().max(160).optional(),
  categoryId: objectIdSchema.optional(),
  providerId: objectIdSchema.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['createdAt', 'averageRating', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export const adminServiceStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const adminBookingQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: z.string().trim().max(100).optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
  customerId: objectIdSchema.optional(),
  providerId: objectIdSchema.optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  sortBy: z.enum(['createdAt', 'scheduledDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict().refine(
  (data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

export const adminReportQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  reason: z.enum(['SPAM', 'ABUSIVE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'OTHER']).optional(),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();
