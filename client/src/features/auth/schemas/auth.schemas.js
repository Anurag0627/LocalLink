import { z } from 'zod';

const password = z.string().min(12, 'Password must be at least 12 characters').max(128);

const name = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Enter a valid email address').max(254).toLowerCase(),
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254).toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});

export const customerRegistrationSchema = name;

export const providerRegistrationSchema = name.extend({
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(150),
  description: z.string().trim().max(4000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80),
});
