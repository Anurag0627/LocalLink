import User from '../models/user.model.js';
import { omitUndefined } from '../utils/object.utils.js';

export function findById(userId, session) {
  const query = User.findById(userId);
  if (session) {
    query.session(session);
  }
  return query;
}

export function findByIdWithPassword(userId) {
  return User.findById(userId).select('+password +authVersion');
}

export function updatePersonalInformation(userId, data, session) {
  const set = {};
  const unset = {};

  for (const [field, value] of Object.entries(omitUndefined(data))) {
    if (value === null) {
      unset[field] = 1;
    } else {
      set[field] = value;
    }
  }

  const update = {};
  if (Object.keys(set).length > 0) {
    update.$set = set;
  }
  if (Object.keys(unset).length > 0) {
    update.$unset = unset;
  }

  const query = User.findOneAndUpdate(
    { _id: userId },
    update,
    { returnDocument: 'after', runValidators: true },
  );
  if (session) {
    query.session(session);
  }
  return query;
}

export function updatePasswordIfCurrent({
  userId,
  currentPasswordHash,
  currentAuthVersion,
  newPasswordHash,
  session,
}) {
  const options = { runValidators: true };
  if (session) {
    options.session = session;
  }

  return User.updateOne(
    {
      _id: userId,
      status: 'ACTIVE',
      password: currentPasswordHash,
      authVersion: currentAuthVersion,
    },
    {
      $set: { password: newPasswordHash },
      $inc: { authVersion: 1 },
    },
    options,
  );
}
