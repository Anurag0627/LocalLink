import * as providerProfileRepository from '../repositories/providerProfile.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';
import * as serviceRepository from '../repositories/service.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import { slugify } from '../models/schemas/common.schemas.js';

async function resolveVerifiedProfile(user) {
  requireRole(user, 'PROVIDER');
  const profile = await providerProfileRepository.findByUserId(user._id);
  if (!profile) throw new ApiError(404, 'Provider profile not found');
  if (profile.verificationStatus !== 'VERIFIED') {
    throw new ApiError(403, 'Only verified providers can manage active service listings');
  }
  return profile;
}

async function resolveActiveCategory(categoryId) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
  if (!category.isActive) throw new ApiError(400, 'Category is inactive');
  return category;
}

function validatePriceCombination(pricingType, price) {
  if (pricingType === 'QUOTE' && price !== undefined && price !== null) {
    throw new ApiError(400, 'Quote pricing must not include a fixed price');
  }
  if (pricingType !== 'QUOTE' && (price === undefined || price === null)) {
    throw new ApiError(400, 'Price is required for the selected pricing type');
  }
}

async function uniqueProviderSlug(profileId, title, excludedServiceId) {
  const slug = slugify(title);
  const conflict = await serviceRepository.findByProviderAndSlug(profileId, slug);
  if (conflict && conflict._id.toString() !== excludedServiceId?.toString()) {
    throw new ApiError(409, 'A service with this title already exists');
  }
  return slug;
}

export async function createService(user, data) {
  const profile = await resolveVerifiedProfile(user);
  await resolveActiveCategory(data.category);
  const slug = await uniqueProviderSlug(profile._id, data.title);
  validatePriceCombination(data.pricingType, data.price);
  try {
    const service = await serviceRepository.create({
      ...data,
      provider: profile._id,
      slug,
      isActive: true,
      averageRating: 0,
      totalReviews: 0,
      totalBookings: 0,
    });
    return service.toJSON();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A service with this title already exists');
    throw error;
  }
}

export async function listMine(user, query) {
  const profile = await resolveVerifiedProfileForListing(user);
  const result = await serviceRepository.listForProvider({
    providerId: profile._id,
    ...query,
  });
  return {
    items: result.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

async function resolveVerifiedProfileForListing(user) {
  requireRole(user, 'PROVIDER');
  const profile = await providerProfileRepository.findByUserId(user._id);
  if (!profile) throw new ApiError(404, 'Provider profile not found');
  return profile;
}

export async function getOwnedService(user, serviceId) {
  const profile = await resolveVerifiedProfileForListing(user);
  const service = await serviceRepository.findOwnedById(serviceId, profile._id);
  if (!service) throw new ApiError(404, 'Service not found');
  return service.toJSON();
}

export async function updateService(user, serviceId, data) {
  const profile = await resolveVerifiedProfile(user);
  const service = await serviceRepository.findOwnedById(serviceId, profile._id);
  if (!service) throw new ApiError(404, 'Service not found');

  const update = {};
  for (const [field, value] of Object.entries(data)) {
    if (value !== undefined) update[field] = value;
  }
  if (update.category) await resolveActiveCategory(update.category);
  const nextPricingType = update.pricingType ?? service.pricingType;
  const nextPrice = Object.prototype.hasOwnProperty.call(update, 'price')
    ? update.price
    : service.price;
  if (nextPricingType === 'QUOTE') {
    if (update.price !== undefined && update.price !== null) {
      throw new ApiError(400, 'Quote pricing must not include a fixed price');
    }
    update.price = undefined;
  } else {
    validatePriceCombination(nextPricingType, nextPrice);
  }
  if (update.title) update.slug = await uniqueProviderSlug(profile._id, update.title, service._id);

  const set = {};
  for (const [field, value] of Object.entries(update)) {
    if (value !== undefined) set[field] = value;
  }
  if (nextPricingType === 'QUOTE') set.price = undefined;

  const updateOperation = set.price === undefined
    ? { $set: Object.fromEntries(Object.entries(set).filter(([field]) => field !== 'price')), $unset: { price: 1 } }
    : { $set: set };
  try {
    const updated = await serviceRepository.updateById(serviceId, updateOperation);
    return updated.toJSON();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'A service with this title already exists');
    throw error;
  }
}

export async function updateServiceStatus(user, serviceId, isActive) {
  const profile = await resolveVerifiedProfileForListing(user);
  const service = await serviceRepository.findOwnedById(serviceId, profile._id);
  if (!service) throw new ApiError(404, 'Service not found');
  if (isActive) await resolveVerifiedProfile(user);
  const updated = await serviceRepository.updateById(serviceId, { $set: { isActive } });
  return updated.toJSON();
}

export async function deleteService(user, serviceId) {
  const profile = await resolveVerifiedProfileForListing(user);
  const service = await serviceRepository.findOwnedById(serviceId, profile._id);
  if (!service) throw new ApiError(404, 'Service not found');
  if (profile.verificationStatus !== 'VERIFIED' && service.isActive) {
    throw new ApiError(403, 'Only verified providers can manage active service listings');
  }
  const updated = await serviceRepository.updateById(serviceId, { $set: { isActive: false } });
  return updated.toJSON();
}
