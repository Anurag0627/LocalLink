import { z } from 'zod';

export const providerProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(150),
  description: z.string().trim().max(4000).nullable().optional(),
  experienceYears: z.coerce.number().int().min(0).max(80),
  profileImage: z.string().trim().url().optional().or(z.literal('')),
});

export const serviceSchema = z.object({
  category: z.string().trim().min(1),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(5000),
  pricingType: z.enum(['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE']),
  price: z.union([z.coerce.number().finite().min(0), z.literal('')]).optional(),
  estimatedDuration: z.union([z.coerce.number().int().min(1), z.literal('')]).optional(),
  serviceLocationType: z.enum(['AT_CUSTOMER_LOCATION', 'AT_PROVIDER_LOCATION', 'REMOTE']),
});

export const serviceAreaSchema = z.object({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  postalCodesText: z.string().trim().max(500).optional(),
});
