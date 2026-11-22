import { describe, expect, it } from 'vitest';
import { customerRegistrationSchema, loginSchema, providerRegistrationSchema } from './auth.schemas.js';

describe('authentication schemas', () => {
  it('rejects an invalid login email', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: 'validpassword!' }).success).toBe(false);
  });

  it('validates customer registration and password confirmation', () => {
    const result = customerRegistrationSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'a-long-valid-password',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('validates provider registration fields', () => {
    const result = providerRegistrationSchema.safeParse({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      password: 'a-long-valid-password',
      confirmPassword: 'a-long-valid-password',
      businessName: 'Reliable Services',
      experienceYears: 5,
    });
    expect(result.success).toBe(true);
  });
});
