import CustomerProfile from '../models/customerProfile.model.js';

export function findByUserId(userId, session) {
  const query = CustomerProfile.findOne({ user: userId });
  if (session) {
    query.session(session);
  }
  return query;
}

export function updateProfileImage(userId, profileImage, session) {
  const update = profileImage === null
    ? { $unset: { profileImage: 1 }, $inc: { __v: 1 } }
    : { $set: { profileImage }, $inc: { __v: 1 } };
  const query = CustomerProfile.findOneAndUpdate(
    { user: userId },
    update,
    { returnDocument: 'after', runValidators: true },
  );
  if (session) {
    query.session(session);
  }
  return query;
}
