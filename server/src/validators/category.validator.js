import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

const nameSchema = z.string().trim().min(2).max(100);
const imageSchema = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)))
  .nullable()
  .optional();

export const categoryIdParamsSchema = z.object({ categoryId: objectIdSchema }).strict();
export const categorySlugParamsSchema = z.object({ slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid category slug') }).strict();

export const createCategorySchema = z.object({
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(100).optional(),
  image: imageSchema,
  displayOrder: z.number().int().min(0).optional(),
}).strict();

export const updateCategorySchema = z.object({
  name: nameSchema.optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  image: imageSchema,
  displayOrder: z.number().int().min(0).optional(),
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined), 'At least one category field must be provided');

export const updateCategoryStatusSchema = z.object({ isActive: z.boolean() }).strict();

export const publicCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['displayOrder', 'name']).default('displayOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
  includeServiceCount: z.enum(['true', 'false']).transform((value) => value === 'true').default(false),
}).strict();
