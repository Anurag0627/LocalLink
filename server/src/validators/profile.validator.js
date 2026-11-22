import { z } from 'zod';
import {
  geoPointSchema,
  objectIdSchema,
  phoneSchema,
  postalCodeSchema,
  requireAtLeastOneField,
} from './common.validator.js';

const nonEmptyString = (max) => z.string().trim().min(1).max(max);

const profileImageSchema = z
  .string()
  .trim()
  .max(2048)
  .pipe(
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
  )
  .nullable()
  .optional();

export const addressParamsSchema = z
  .object({ addressId: objectIdSchema })
  .strict();

export const serviceAreaParamsSchema = z
  .object({ areaId: objectIdSchema })
  .strict();

const addressFields = {
  label: z.enum(['Home', 'Work', 'Other']),
  fullAddress: nonEmptyString(500),
  street: nonEmptyString(200),
  city: nonEmptyString(100),
  state: nonEmptyString(100),
  postalCode: postalCodeSchema,
  country: nonEmptyString(100),
};
const addressPatchFields = Object.fromEntries(
  Object.entries(addressFields).map(([field, schema]) => [field, schema.optional()]),
);

export const createAddressSchema = z
  .object({
    ...addressFields,
    location: geoPointSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateAddressSchema = z
  .object({
    ...addressPatchFields,
    location: geoPointSchema.nullable().optional(),
  })
  .strict()
  .refine(requireAtLeastOneField, 'At least one address field must be provided');

const serviceAreaFields = {
  city: nonEmptyString(100),
  state: nonEmptyString(100),
  country: nonEmptyString(100),
  postalCodes: z.array(postalCodeSchema).max(50).refine(
    (postalCodes) => new Set(postalCodes).size === postalCodes.length,
    'Postal codes must not contain duplicates',
  ),
};

export const createServiceAreaSchema = z
  .object({
    ...serviceAreaFields,
    postalCodes: serviceAreaFields.postalCodes.default([]),
    location: geoPointSchema.optional(),
  })
  .strict();

export const updateServiceAreaSchema = z
  .object({
    city: serviceAreaFields.city.optional(),
    state: serviceAreaFields.state.optional(),
    country: serviceAreaFields.country.optional(),
    postalCodes: serviceAreaFields.postalCodes.optional(),
    location: geoPointSchema.nullable().optional(),
  })
  .strict()
  .refine(requireAtLeastOneField, 'At least one service area field must be provided');

export const customerProfileUpdateSchema = z
  .object({
    firstName: nonEmptyString(80).optional(),
    lastName: nonEmptyString(80).optional(),
    phone: phoneSchema,
    profileImage: profileImageSchema,
  })
  .strict()
  .refine(requireAtLeastOneField, 'At least one profile field must be provided');

export const providerProfileUpdateSchema = z
  .object({
    businessName: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    profileImage: profileImageSchema,
  })
  .strict()
  .refine(requireAtLeastOneField, 'At least one profile field must be provided');

export const providerAvailabilitySchema = z
  .object({ isAvailable: z.boolean() })
  .strict();
