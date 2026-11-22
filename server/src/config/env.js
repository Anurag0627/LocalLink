import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const clientUrlSchema = z.url().refine((value) => {
  const { protocol } = new URL(value);
  return protocol === 'http:' || protocol === 'https:';
}, 'Client URLs must use http:// or https://');

const clientUrlsSchema = z
  .string()
  .transform((value) => value.split(',').map((url) => url.trim()).filter(Boolean))
  .pipe(z.array(clientUrlSchema).min(1, 'At least one client URL is required'))
  .transform((urls) => urls.map((url) => new URL(url).origin));

const mongodbUriSchema = z.string().refine((value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'mongodb:' || protocol === 'mongodb+srv:';
  } catch {
    return false;
  }
}, 'MONGODB_URI must be a valid mongodb:// or mongodb+srv:// URI');

const accessTokenSecretSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .trim()
    .min(64, 'ACCESS_TOKEN_SECRET must be at least 64 characters')
    .max(256)
    .refine(
      (value) => new Set(value).size >= 16,
      'ACCESS_TOKEN_SECRET must contain sufficiently varied random characters',
    )
    .optional(),
);

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: clientUrlsSchema.optional(),
    MONGODB_URI: mongodbUriSchema.optional(),
    ACCESS_TOKEN_SECRET: accessTokenSecretSchema,
    ACCESS_TOKEN_EXPIRES_IN: z
      .string()
      .regex(/^\d+(s|m|h|d)$/, 'ACCESS_TOKEN_EXPIRES_IN must be a duration such as 15m')
      .default('15m'),
    ACCESS_TOKEN_ISSUER: z.string().trim().min(1).default('LocalLink API'),
    ACCESS_TOKEN_AUDIENCE: z.string().trim().min(1).default('LocalLink Client'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(7),
    COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default('locallink_refresh_token'),
    COOKIE_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true').default('false'),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production') {
      if (!environment.CLIENT_URL) {
        context.addIssue({
          code: 'custom',
          path: ['CLIENT_URL'],
          message: 'CLIENT_URL is required in production',
        });
      }

      if (!environment.MONGODB_URI) {
        context.addIssue({
          code: 'custom',
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI is required in production',
        });
      }

      if (!environment.ACCESS_TOKEN_SECRET) {
        context.addIssue({
          code: 'custom',
          path: ['ACCESS_TOKEN_SECRET'],
          message: 'ACCESS_TOKEN_SECRET is required in production',
        });
      }

      if (!environment.COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production',
        });
      }
    }

    if (environment.COOKIE_SAME_SITE === 'none' && !environment.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
      });
    }
  });

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map(({ path, message }) => `- ${path.join('.') || 'environment'}: ${message}`)
    .join('\n');
  const message = `Invalid environment configuration:\n${issues}`;

  console.error(message);
  throw new Error(message);
}

export const env = {
  ...result.data,
  CLIENT_URL: result.data.CLIENT_URL ?? ['http://localhost:5173'],
  MONGODB_URI: result.data.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/locallink',
  ACCESS_TOKEN_SECRET:
    result.data.ACCESS_TOKEN_SECRET ?? randomBytes(48).toString('base64url'),
};
