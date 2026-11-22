import mongoose from 'mongoose';
import ApiError from './ApiError.js';

export async function mutateProfileWithRetry({
  findByUserId,
  userId,
  notFoundMessage,
  mutate,
}) {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const profile = await findByUserId(userId);
    if (!profile) {
      throw new ApiError(404, notFoundMessage);
    }

    const result = await mutate(profile);

    try {
      await profile.save();
      return { profile, result };
    } catch (error) {
      if (!(error instanceof mongoose.Error.VersionError)) {
        throw error;
      }

      if (attempt === maxAttempts - 1) {
        throw new ApiError(409, 'Profile changed during the request; please retry');
      }
    }
  }

  throw new ApiError(409, 'Profile changed during the request; please retry');
}
