import { z } from 'zod';

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const phoneSchema = z.string().trim().max(32).refine((value) => {
  if (!value) return true;
  const digitCount = value.replace(/\D/g, '').length;
  return /^\+?[0-9(). -]+$/.test(value) && digitCount >= 7 && digitCount <= 15;
}, 'Enter a valid phone number with 7 to 15 digits.');

export const customerProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80),
  phone: phoneSchema,
  profileImage: z.string().trim().max(2048).refine(
    (value) => !value || isHttpUrl(value),
    'Enter a valid HTTP or HTTPS image URL.',
  ),
});

export const customerAddressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other'], { message: 'Choose an address label.' }),
  fullAddress: z.string().trim().min(1, 'Enter the full address.').max(500),
  street: z.string().trim().min(1, 'Enter the street.').max(200),
  city: z.string().trim().min(1, 'Enter the city.').max(100),
  state: z.string().trim().min(1, 'Enter the state or region.').max(100),
  postalCode: z.string().trim().regex(
    /^[a-z\d][a-z\d -]{0,31}$/i,
    'Enter a valid postal code.',
  ),
  country: z.string().trim().min(1, 'Enter the country.').max(100),
});

export const emptyCustomerAddress = {
  label: 'Home',
  fullAddress: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};
