import CustomerProfile from '../models/customerProfile.model.js';
import ProviderProfile from '../models/providerProfile.model.js';
import User from '../models/user.model.js';

export function findUserByEmail(email, { includePassword = false } = {}) {
  const query = User.findOne({ email });

  if (includePassword) {
    query.select('+password +authVersion');
  }

  return query;
}

export function findUserById(userId) {
  return User.findById(userId).select('+authVersion');
}

export function updateLastLogin(userId, lastLoginAt, passwordHash, authVersion) {
  return User.findOneAndUpdate(
    {
      _id: userId,
      status: 'ACTIVE',
      password: passwordHash,
      authVersion,
    },
    { $set: { lastLoginAt } },
    { returnDocument: 'after', runValidators: true },
  ).select('+authVersion');
}

export function createUser(data, session) {
  const user = new User(data);
  return session ? user.save({ session }) : user.save();
}

export function createCustomerProfile(data, session) {
  const profile = new CustomerProfile(data);
  return session ? profile.save({ session }) : profile.save();
}

export function createProviderProfile(data, session) {
  const profile = new ProviderProfile(data);
  return session ? profile.save({ session }) : profile.save();
}

export function deleteProfileForUser(userId, role) {
  const Profile = role === 'CUSTOMER' ? CustomerProfile : ProviderProfile;
  return Profile.deleteOne({ user: userId });
}

export function deleteUserById(userId) {
  return User.deleteOne({ _id: userId });
}

export function findProfileForUser(user) {
  if (user.role === 'CUSTOMER') {
    return CustomerProfile.findOne({ user: user._id }).lean();
  }

  if (user.role === 'PROVIDER') {
    return ProviderProfile.findOne({ user: user._id }).lean();
  }

  return null;
}
