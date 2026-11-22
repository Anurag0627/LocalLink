import { z } from 'zod';
import { geoPointSchema, objectIdSchema, postalCodeSchema } from './common.validator.js';

const imageSchema = z.string().trim().max(2048).pipe(
  z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
);

const serviceAreaSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  postalCodes: z.array(postalCodeSchema).max(50).default([]),
  location: geoPointSchema.optional(),
}).strict();

const availabilitySchema = z.object({
  day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  isAvailable: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
}).strict().refine((value) => {
  if (!value.isAvailable) return true;
  return value.startTime && value.endTime && value.startTime < value.endTime;
}, 'Available days require a valid start and end time');

const pricingFields = {
  pricingType: z.enum(['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE']),
  price: z.number().finite().min(0).optional(),
};

function validatePricing(data) {
  if (data.pricingType === 'QUOTE') return data.price === undefined;
  return data.price !== undefined;
}

const serviceFields = {
  category: objectIdSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(5000),
  images: z.array(imageSchema).max(20).default([]),
  ...pricingFields,
  estimatedDuration: z.number().int().min(1).optional(),
  serviceLocationType: z.enum(['AT_CUSTOMER_LOCATION', 'AT_PROVIDER_LOCATION', 'REMOTE']),
  serviceAreas: z.array(serviceAreaSchema).max(50).default([]),
  availability: z.array(availabilitySchema).max(7).refine(
    (values) => new Set(values.map(({ day }) => day)).size === values.length,
    'Availability can include each weekday only once',
  ).default([]),
};

export const createServiceSchema = z.object(serviceFields).strict()
  .refine(validatePricing, 'Price is required for non-quote pricing and omitted for quote pricing');

export const updateServiceSchema = z.object({
  category: objectIdSchema.optional(),
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  images: z.array(imageSchema).max(20).optional(),
  pricingType: pricingFields.pricingType.optional(),
  price: z.number().finite().min(0).nullable().optional(),
  estimatedDuration: z.number().int().min(1).nullable().optional(),
  serviceLocationType: z.enum(['AT_CUSTOMER_LOCATION', 'AT_PROVIDER_LOCATION', 'REMOTE']).optional(),
  serviceAreas: z.array(serviceAreaSchema).max(50).optional(),
  availability: z.array(availabilitySchema).max(7).refine(
    (values) => new Set(values.map(({ day }) => day)).size === values.length,
  ).optional(),
}).strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'At least one service field must be provided')
.refine((data) => data.pricingType !== 'QUOTE' || data.price === undefined || data.price === null, 'Quote pricing must not include a fixed price');

export const updateServiceStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const serviceIdParamsSchema = z.object({ serviceId: objectIdSchema }).strict();

export const providerServiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.union([objectIdSchema, z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();
