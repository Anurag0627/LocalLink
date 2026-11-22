import mongoose from 'mongoose';
import logger from '../config/logger.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as customerProfileRepository from '../repositories/customerProfile.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import { isTransactionUnsupported } from '../utils/mongo.utils.js';
import { omitUndefined } from '../utils/object.utils.js';
import { mutateProfileWithRetry } from '../utils/profileMutation.utils.js';

const notFoundMessage = 'Customer profile not found';

function getDefaultAddressId(profile) {
  const referencedAddress = profile.defaultAddressId
    ? profile.addresses.id(profile.defaultAddressId)
    : undefined;
  return referencedAddress?._id ?? profile.addresses.find((address) => address.isDefault)?._id;
}

function setDefaultAddress(profile, defaultAddressId) {
  const defaultId = defaultAddressId?.toString();

  for (const address of profile.addresses) {
    address.isDefault = Boolean(defaultId && address._id.toString() === defaultId);
  }

  profile.defaultAddressId = defaultAddressId || undefined;
}

function profileResponse(user, profile) {
  const serializedProfile = profile.toJSON();
  delete serializedProfile.user;
  delete serializedProfile.__v;

  return {
    user: user.toJSON(),
    profile: serializedProfile,
  };
}

async function updateCustomerProfileAndAccount(userId, userChanges, profileImage) {
  const session = await mongoose.startSession();
  let updatedUser;
  let updatedProfile;
  let useFallback = false;

  try {
    await session.withTransaction(async () => {
      updatedUser = await accountRepository.updatePersonalInformation(
        userId,
        userChanges,
        session,
      );
      updatedProfile = await customerProfileRepository.updateProfileImage(
        userId,
        profileImage,
        session,
      );

      if (!updatedUser) {
        throw new ApiError(404, 'Account not found');
      }
      if (!updatedProfile) {
        throw new ApiError(404, notFoundMessage);
      }
    });
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }

    useFallback = true;
    logger.info('MongoDB transactions are unavailable; using profile update rollback');
  } finally {
    await session.endSession();
  }

  if (!useFallback) {
    return profileResponse(updatedUser, updatedProfile);
  }

  const [previousUser, previousProfile] = await Promise.all([
    accountRepository.findById(userId),
    customerProfileRepository.findByUserId(userId),
  ]);
  if (!previousUser) {
    throw new ApiError(404, 'Account not found');
  }
  if (!previousProfile) {
    throw new ApiError(404, notFoundMessage);
  }

  const previousUserValues = Object.fromEntries(
    Object.keys(userChanges).map((field) => [field, previousUser[field] ?? null]),
  );
  const previousProfileImage = previousProfile.profileImage ?? null;

  try {
    updatedUser = await accountRepository.updatePersonalInformation(userId, userChanges);
    if (!updatedUser) {
      throw new ApiError(404, 'Account not found');
    }

    updatedProfile = await customerProfileRepository.updateProfileImage(
      userId,
      profileImage,
    );
    if (!updatedProfile) {
      throw new ApiError(404, notFoundMessage);
    }

    return profileResponse(updatedUser, updatedProfile);
  } catch (error) {
    let rollbackFailed = false;

    try {
      const restoredUser = await accountRepository.updatePersonalInformation(
        userId,
        previousUserValues,
      );
      if (!restoredUser) {
        throw new Error('Account no longer exists');
      }
    } catch (rollbackError) {
      rollbackFailed = true;
      logger.error(
        { errorName: rollbackError.name },
        'Customer account rollback failed',
      );
    }

    try {
      const restoredProfile = await customerProfileRepository.updateProfileImage(
        userId,
        previousProfileImage,
      );
      if (!restoredProfile) {
        throw new Error('Customer profile no longer exists');
      }
    } catch (rollbackError) {
      rollbackFailed = true;
      logger.error(
        { errorName: rollbackError.name },
        'Customer profile rollback failed',
      );
    }

    if (rollbackFailed) {
      throw new ApiError(
        500,
        'Profile update failed and rollback was incomplete',
        undefined,
        { isOperational: false },
      );
    }

    throw error;
  }
}

export async function getProfile(user) {
  requireRole(user, 'CUSTOMER');
  const profile = await customerProfileRepository.findByUserId(user._id);
  if (!profile) {
    throw new ApiError(404, notFoundMessage);
  }
  return profileResponse(user, profile);
}

export async function updateProfile(authenticatedUser, data) {
  requireRole(authenticatedUser, 'CUSTOMER');
  const userId = authenticatedUser._id;
  const { profileImage, ...userInput } = data;
  const userChanges = omitUndefined(userInput);
  const hasUserChanges = Object.keys(userChanges).length > 0;
  const hasProfileImage = profileImage !== undefined;

  if (hasUserChanges && hasProfileImage) {
    return updateCustomerProfileAndAccount(userId, userChanges, profileImage);
  }

  const [existingUser, existingProfile] = await Promise.all([
    accountRepository.findById(userId),
    customerProfileRepository.findByUserId(userId),
  ]);
  if (!existingUser) {
    throw new ApiError(404, 'Account not found');
  }
  if (!existingProfile) {
    throw new ApiError(404, notFoundMessage);
  }

  const updatedUser = hasUserChanges
    ? await accountRepository.updatePersonalInformation(userId, userChanges)
    : existingUser;
  const profile = hasProfileImage
    ? await customerProfileRepository.updateProfileImage(userId, profileImage)
    : existingProfile;

  if (!updatedUser) {
    throw new ApiError(404, 'Account not found');
  }
  if (!profile) {
    throw new ApiError(404, notFoundMessage);
  }

  return profileResponse(updatedUser, profile);
}

export async function listAddresses(user) {
  requireRole(user, 'CUSTOMER');
  const userId = user._id;
  const profile = await customerProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new ApiError(404, notFoundMessage);
  }

  return {
    addresses: profile.addresses.map((address) => address.toJSON()),
    defaultAddressId: profile.defaultAddressId?.toString() ?? null,
  };
}

export async function addAddress(user, data) {
  requireRole(user, 'CUSTOMER');
  const { profile, result: addressId } = await mutateProfileWithRetry({
    findByUserId: customerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(customerProfile) {
      const existingDefaultId = getDefaultAddressId(customerProfile);
      const existingAddressCount = customerProfile.addresses.length;
      const address = customerProfile.addresses.create(data);
      customerProfile.addresses.push(address);

      let nextDefaultId = existingDefaultId;
      if (
        data.isDefault === true
        || (!existingDefaultId && existingAddressCount === 0 && data.isDefault === undefined)
      ) {
        nextDefaultId = address._id;
      } else if (data.isDefault === false && !existingDefaultId) {
        nextDefaultId = undefined;
      }

      setDefaultAddress(customerProfile, nextDefaultId);
      return address._id.toString();
    },
  });

  return {
    address: profile.addresses.id(addressId).toJSON(),
    defaultAddressId: profile.defaultAddressId?.toString() ?? null,
  };
}

export async function updateAddress(user, addressId, data) {
  requireRole(user, 'CUSTOMER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: customerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(customerProfile) {
      const address = customerProfile.addresses.id(addressId);
      if (!address) {
        throw new ApiError(404, 'Address not found');
      }

      for (const [field, value] of Object.entries(omitUndefined(data))) {
        address.set(field, value === null ? undefined : value);
      }

      setDefaultAddress(customerProfile, getDefaultAddressId(customerProfile));
    },
  });

  return {
    address: profile.addresses.id(addressId).toJSON(),
    defaultAddressId: profile.defaultAddressId?.toString() ?? null,
  };
}

export async function deleteAddress(user, addressId) {
  requireRole(user, 'CUSTOMER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: customerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(customerProfile) {
      const address = customerProfile.addresses.id(addressId);
      if (!address) {
        throw new ApiError(404, 'Address not found');
      }

      const previousDefaultId = getDefaultAddressId(customerProfile);
      const wasDefault = previousDefaultId?.toString() === address._id.toString();
      address.deleteOne();

      const nextDefaultId = wasDefault
        ? customerProfile.addresses[0]?._id
        : getDefaultAddressId(customerProfile);
      setDefaultAddress(customerProfile, nextDefaultId);
    },
  });

  return {
    addresses: profile.addresses.map((address) => address.toJSON()),
    defaultAddressId: profile.defaultAddressId?.toString() ?? null,
  };
}

export async function setAddressDefault(user, addressId) {
  requireRole(user, 'CUSTOMER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: customerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(customerProfile) {
      const address = customerProfile.addresses.id(addressId);
      if (!address) {
        throw new ApiError(404, 'Address not found');
      }
      setDefaultAddress(customerProfile, address._id);
    },
  });

  return {
    address: profile.addresses.id(addressId).toJSON(),
    defaultAddressId: profile.defaultAddressId?.toString() ?? null,
  };
}
