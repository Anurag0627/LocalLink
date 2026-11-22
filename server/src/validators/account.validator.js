import { z } from 'zod';
import { phoneSchema, requireAtLeastOneField } from './common.validator.js';

export const accountUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: phoneSchema,
  })
  .strict()
  .refine(requireAtLeastOneField, 'At least one account field must be provided');

const passwordSchema = z.string().min(12).max(128);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().max(128),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current password',
  });
