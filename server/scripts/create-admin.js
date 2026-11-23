import argon2 from 'argon2';
import { z } from 'zod';
import { closeDatabase, connectDatabase } from '../src/config/database.js';
import User from '../src/models/user.model.js';

const adminInputSchema = z.object({
  ADMIN_FIRST_NAME: z.string().trim().min(1).max(80),
  ADMIN_LAST_NAME: z.string().trim().min(1).max(80),
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  ADMIN_PASSWORD: z.string().min(12).max(128),
});

const input = adminInputSchema.safeParse(process.env);

if (!input.success) {
  const issues = input.error.issues
    .map(({ path, message }) => `- ${path.join('.')}: ${message}`)
    .join('\n');
  console.error(`Invalid admin setup input:\n${issues}`);
  process.exitCode = 1;
} else {
  await connectDatabase();

  try {
    const { ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = input.data;
    const existingUser = await User.findOne({ email: ADMIN_EMAIL }).select('role').lean();

    if (existingUser) {
      throw new Error(`An account already exists for ${ADMIN_EMAIL}; this command does not change existing accounts.`);
    }

    const password = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
    await User.create({
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      password,
      role: 'ADMIN',
    });

    console.log(`Administrator account created for ${ADMIN_EMAIL}. Sign in at /login.`);
  } finally {
    await closeDatabase();
  }
}
