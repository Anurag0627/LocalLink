import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z.string().min(12).max(128);
const personalDetails = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
};

const customerRegistrationSchema = z
  .object({
    ...personalDetails,
    role: z.literal('CUSTOMER'),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

const providerRegistrationSchema = z
  .object({
    ...personalDetails,
    role: z.literal('PROVIDER'),
    businessName: z.string().trim().min(2).max(150),
    description: z.string().trim().max(4000).optional(),
    experienceYears: z.number().int().min(0).max(80),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const registrationSchema = z.discriminatedUnion('role', [
  customerRegistrationSchema,
  providerRegistrationSchema,
]);

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();
