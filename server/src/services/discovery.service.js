import * as discoveryRepository from '../repositories/discovery.repository.js';
import ApiError from '../utils/ApiError.js';

export async function listServices(query) {
  const result = await discoveryRepository.list(query);
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

export async function getService(serviceId) {
  const service = await discoveryRepository.findPublicById(serviceId);
  if (
    !service
    || !service.isActive
    || !service.category?.isActive
    || service.provider?.verificationStatus !== 'VERIFIED'
    || service.provider?.user?.status !== 'ACTIVE'
  ) {
    throw new ApiError(404, 'Service not found');
  }

  const provider = service.provider;
  return {
    service: {
      _id: service._id,
      title: service.title,
      slug: service.slug,
      description: service.description,
      images: service.images,
      pricingType: service.pricingType,
      price: service.price,
      estimatedDuration: service.estimatedDuration,
      serviceLocationType: service.serviceLocationType,
      serviceAreas: service.serviceAreas,
      availability: service.availability,
      averageRating: service.averageRating,
      totalReviews: service.totalReviews,
      totalBookings: service.totalBookings,
    },
    category: service.category,
    provider: {
      businessName: provider.businessName,
      description: provider.description,
      profileImage: provider.profileImage,
      experienceYears: provider.experienceYears,
      averageRating: provider.averageRating,
      totalReviews: provider.totalReviews,
      serviceAreas: provider.serviceAreas,
    },
  };
}

export async function listCategories(query) {
  const result = await discoveryRepository.listCategories(query);
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

export async function getProvider(providerId) {
  const provider = await discoveryRepository.findPublicProviderById(providerId);
  if (!provider) throw new ApiError(404, 'Provider not found');
  return provider;
}

export async function listProviderServices(providerId, query) {
  const provider = await discoveryRepository.resolveEligibleProvider(providerId);
  if (!provider) throw new ApiError(404, 'Provider not found');

  const result = await discoveryRepository.listProviderServices(providerId, query);
  if (!result) throw new ApiError(404, 'Provider not found');
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
