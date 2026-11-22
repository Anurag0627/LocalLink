import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const optionalText = z.string().trim().max(100).optional();

export const discoveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: optionalText,
  category: z.union([objectIdSchema, z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]).optional(),
  city: optionalText,
  state: optionalText,
  postalCode: z.string().trim().max(32).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  pricingType: z.enum(['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE']).optional(),
  sortBy: z.enum(['newest', 'oldest', 'price_low', 'price_high', 'rating', 'popular']).default('newest'),
  order: z.enum(['asc', 'desc']).optional(),
}).strict().refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, 'minPrice cannot exceed maxPrice');

export const discoveryCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalText,
  sortBy: z.enum(['displayOrder', 'name']).default('displayOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
}).strict();

export const publicProviderParamsSchema = z.object({
  providerId: objectIdSchema,
}).strict();

export const publicProviderServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  sortBy: z.enum(['newest', 'oldest', 'price_low', 'price_high', 'rating', 'popular']).default('newest'),
  order: z.enum(['asc', 'desc']).optional(),
}).strict();
