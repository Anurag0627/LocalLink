import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const httpUrlSchema = z.string().trim().url().refine(
  (value) => /^https?:\/\//i.test(value),
  'Image URL must use HTTP or HTTPS',
);

export const createReviewSchema = z.object({
  booking: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  images: z.array(httpUrlSchema).max(10).default([]),
}).strict();

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
  images: z.array(httpUrlSchema).max(10).optional(),
}).strict().refine(
  (data) => data.rating !== undefined || data.comment !== undefined || data.images !== undefined,
  'At least one review field is required',
);

export const reviewIdSchema = z.object({
  reviewId: objectIdSchema,
}).strict();

export const reviewOwnerIdSchema = z.object({
  providerId: objectIdSchema,
}).strict();

export const serviceReviewIdSchema = z.object({
  serviceId: objectIdSchema,
}).strict();

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const reviewQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
  order: z.enum(['asc', 'desc']).optional(),
}).strict();

export const adminReviewQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  status: z.enum(['PUBLISHED', 'HIDDEN']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  reported: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['createdAt', 'rating', 'reportCount']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export const reportReviewSchema = z.object({
  reason: z.enum(['SPAM', 'ABUSIVE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'OTHER']),
  description: z.string().trim().min(1).max(2000).optional(),
}).strict();

export const moderateReviewSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN']),
  reason: z.string().trim().min(1).max(1000),
}).strict();
