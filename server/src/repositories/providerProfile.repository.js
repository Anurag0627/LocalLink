import ProviderProfile from '../models/providerProfile.model.js';

export function findByUserId(userId, session) {
  const query = ProviderProfile.findOne({ user: userId });
  if (session) {
    query.session(session);
  }
  return query;
}

export function findById(profileId) {
  return ProviderProfile.findById(profileId);
}

export function incrementCompletedBookings(profileId) {
  return ProviderProfile.findByIdAndUpdate(
    profileId,
    { $inc: { totalCompletedBookings: 1 } },
    { returnDocument: 'after', runValidators: true },
  );
}
