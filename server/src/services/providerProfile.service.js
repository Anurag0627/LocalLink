import * as providerProfileRepository from '../repositories/providerProfile.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import { omitUndefined } from '../utils/object.utils.js';
import { mutateProfileWithRetry } from '../utils/profileMutation.utils.js';

const notFoundMessage = 'Provider profile not found';

function getServiceAreaKey(area) {
  const postalCodes = [...(area.postalCodes ?? [])]
    .map((postalCode) => postalCode.trim().toUpperCase())
    .sort();

  return [
    area.city.trim().toLowerCase(),
    area.state.trim().toLowerCase(),
    area.country.trim().toLowerCase(),
    postalCodes.join(','),
  ].join('|');
}

function ensureUniqueServiceArea(profile, nextArea, excludedId) {
  const key = getServiceAreaKey(nextArea);
  const duplicate = profile.serviceAreas.some(
    (area) => area._id?.toString() !== excludedId?.toString()
      && getServiceAreaKey(area) === key,
  );

  if (duplicate) {
    throw new ApiError(409, 'This service area already exists');
  }
}

function serializeProfile(profile) {
  const serializedProfile = profile.toJSON();
  delete serializedProfile.user;
  delete serializedProfile.__v;
  return serializedProfile;
}

function profileResponse(user, profile) {
  return {
    user: user.toJSON(),
    profile: serializeProfile(profile),
  };
}

export async function getProfile(user) {
  requireRole(user, 'PROVIDER');
  const profile = await providerProfileRepository.findByUserId(user._id);
  if (!profile) {
    throw new ApiError(404, notFoundMessage);
  }
  return profileResponse(user, profile);
}

export async function updateProfile(user, data) {
  requireRole(user, 'PROVIDER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: providerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(providerProfile) {
      for (const [field, value] of Object.entries(omitUndefined(data))) {
        providerProfile.set(field, value === null ? undefined : value);
      }
    },
  });

  return profileResponse(user, profile);
}

export async function listServiceAreas(user) {
  requireRole(user, 'PROVIDER');
  const profile = await providerProfileRepository.findByUserId(user._id);
  if (!profile) {
    throw new ApiError(404, notFoundMessage);
  }
  return { serviceAreas: profile.serviceAreas.map((area) => area.toJSON()) };
}

export async function addServiceArea(user, data) {
  requireRole(user, 'PROVIDER');
  const { profile, result: areaId } = await mutateProfileWithRetry({
    findByUserId: providerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(providerProfile) {
      ensureUniqueServiceArea(providerProfile, data);
      const area = providerProfile.serviceAreas.create(data);
      providerProfile.serviceAreas.push(area);
      return area._id.toString();
    },
  });

  return { serviceArea: profile.serviceAreas.id(areaId).toJSON() };
}

export async function updateServiceArea(user, areaId, data) {
  requireRole(user, 'PROVIDER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: providerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(providerProfile) {
      const area = providerProfile.serviceAreas.id(areaId);
      if (!area) {
        throw new ApiError(404, 'Service area not found');
      }

      const changes = omitUndefined(data);
      const nextArea = {
        ...area.toObject(),
        ...changes,
        postalCodes: changes.postalCodes ?? area.postalCodes,
      };
      if (changes.location === null) {
        delete nextArea.location;
      }
      ensureUniqueServiceArea(providerProfile, nextArea, areaId);

      for (const [field, value] of Object.entries(changes)) {
        area.set(field, value === null ? undefined : value);
      }
    },
  });

  return { serviceArea: profile.serviceAreas.id(areaId).toJSON() };
}

export async function deleteServiceArea(user, areaId) {
  requireRole(user, 'PROVIDER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: providerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(providerProfile) {
      const area = providerProfile.serviceAreas.id(areaId);
      if (!area) {
        throw new ApiError(404, 'Service area not found');
      }
      area.deleteOne();
    },
  });

  return { serviceAreas: profile.serviceAreas.map((area) => area.toJSON()) };
}

export async function updateAvailability(user, isAvailable) {
  requireRole(user, 'PROVIDER');
  const { profile } = await mutateProfileWithRetry({
    findByUserId: providerProfileRepository.findByUserId,
    userId: user._id,
    notFoundMessage,
    mutate(providerProfile) {
      providerProfile.isAvailable = isAvailable;
    },
  });

  return { profile: serializeProfile(profile) };
}
