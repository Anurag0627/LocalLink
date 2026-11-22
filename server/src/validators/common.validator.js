import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[\da-f]{24}$/i, 'Invalid resource ID');

export const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^\+?[0-9(). -]+$/, 'Phone number contains invalid characters')
  .refine((value) => {
    const digitCount = value.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15;
  }, 'Phone number must contain between 7 and 15 digits')
  .nullable()
  .optional();

export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z\d][a-z\d -]{0,31}$/i, 'Postal code contains invalid characters')
  .transform((value) => value.toUpperCase());

export const geoPointSchema = z
  .object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().finite().min(-180).max(180),
      z.number().finite().min(-90).max(90),
    ]),
  })
  .strict();

export function requireAtLeastOneField(data) {
  return Object.values(data).some((value) => value !== undefined);
}
