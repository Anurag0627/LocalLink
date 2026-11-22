import mongoose from 'mongoose';
import Category from '../models/category.model.js';
import ProviderProfile from '../models/providerProfile.model.js';
import Service from '../models/service.model.js';
import User from '../models/user.model.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveCategory(category) {
  if (!category) return null;
  const query = mongoose.isValidObjectId(category)
    ? { _id: category }
    : { slug: category };
  return Category.findOne({ ...query, isActive: true }).select('_id').lean();
}

export async function list({ page, limit, search, category, city, state, postalCode, minPrice, maxPrice, pricingType, sortBy, order }) {
  const categoryDocument = await resolveCategory(category);
  if (category && !categoryDocument) return { items: [], total: 0 };

  const activeUsers = await User.find({ role: 'PROVIDER', status: 'ACTIVE' }).select('_id').lean();
  const activeUserIds = activeUsers.map(({ _id }) => _id);
  const providers = await ProviderProfile.find({
    user: { $in: activeUserIds },
    verificationStatus: 'VERIFIED',
  }).select('_id').lean();
  const providerIds = providers.map(({ _id }) => _id);
  const activeCategories = await Category.find({ isActive: true }).select('_id').lean();
  const activeCategoryIds = activeCategories.map(({ _id }) => _id);
  const filter = {
    isActive: true,
    provider: { $in: providerIds },
    category: { $in: activeCategoryIds },
  };
  if (activeCategoryIds.length === 0 || providerIds.length === 0) return { items: [], total: 0 };
  if (categoryDocument) filter.category = categoryDocument._id;
  if (pricingType) filter.pricingType = pricingType;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (city) filter['serviceAreas.city'] = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };
  if (state) filter['serviceAreas.state'] = { $regex: `^${escapeRegex(state)}$`, $options: 'i' };
  if (postalCode) filter['serviceAreas.postalCodes'] = postalCode.trim().toUpperCase();

  let sort;
  switch (sortBy) {
    case 'oldest': sort = { createdAt: order === 'desc' ? -1 : 1 }; break;
    case 'price_low': sort = { price: order === 'desc' ? -1 : 1 }; break;
    case 'price_high': sort = { price: order === 'asc' ? 1 : -1 }; break;
    case 'rating': sort = { averageRating: order === 'asc' ? 1 : -1, totalReviews: order === 'asc' ? 1 : -1 }; break;
    case 'popular': sort = { totalBookings: order === 'asc' ? 1 : -1, averageRating: order === 'asc' ? 1 : -1 }; break;
    default: sort = { createdAt: order === 'asc' ? 1 : -1 };
  }
  if (search) {
    filter.$text = {
      $search: search.replace(/["()+\-~<>@]/g, ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  const [items, total] = await Promise.all([
    Service.find(filter)
      .populate({
        path: 'provider',
        select: 'businessName description profileImage experienceYears averageRating totalReviews serviceAreas isAvailable verificationStatus user',
        populate: { path: 'user', select: 'status role' },
      })
      .populate('category', 'name slug icon image isActive')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);
  const visible = items.filter((item) =>
    item.category?.isActive
    && item.provider?.verificationStatus === 'VERIFIED'
    && item.provider?.user?.status === 'ACTIVE');
  return { items: visible, total };
}

export function findPublicById(serviceId) {
  return Service.findOne({ _id: serviceId, isActive: true })
    .populate({
      path: 'provider',
      select: 'businessName description profileImage experienceYears averageRating totalReviews serviceAreas isAvailable verificationStatus user',
      populate: { path: 'user', select: 'status role' },
    })
    .populate('category', 'name slug icon image isActive')
    .lean();
}

export async function resolveEligibleProvider(providerId) {
  const profile = await ProviderProfile.findOne({
    $or: [{ _id: providerId }, { user: providerId }],
  })
    .populate({
      path: 'user',
      select: 'status role',
    })
    .lean();

  if (
    !profile
    || profile.verificationStatus !== 'VERIFIED'
    || profile.user?.role !== 'PROVIDER'
    || profile.user?.status !== 'ACTIVE'
  ) {
    return null;
  }
  return profile;
}

export async function findPublicProviderById(providerId) {
  const profile = await resolveEligibleProvider(providerId);
  if (!profile) return null;
  return {
    _id: profile._id,
    businessName: profile.businessName,
    description: profile.description,
    profileImage: profile.profileImage,
    experienceYears: profile.experienceYears,
    verificationStatus: profile.verificationStatus,
    serviceAreas: profile.serviceAreas,
    isAvailable: profile.isAvailable,
    averageRating: profile.averageRating,
    totalReviews: profile.totalReviews,
  };
}

export async function listProviderServices(providerId, { page, limit, sortBy, order }) {
  const profile = await resolveEligibleProvider(providerId);
  if (!profile) return null;

  const activeCategories = await Category.find({ isActive: true }).select('_id').lean();
  const activeCategoryIds = activeCategories.map(({ _id }) => _id);
  const filter = {
    isActive: true,
    provider: profile._id,
    category: { $in: activeCategoryIds },
  };

  let sort;
  switch (sortBy) {
    case 'oldest': sort = { createdAt: order === 'desc' ? -1 : 1 }; break;
    case 'price_low': sort = { price: order === 'desc' ? -1 : 1 }; break;
    case 'price_high': sort = { price: order === 'asc' ? 1 : -1 }; break;
    case 'rating': sort = { averageRating: order === 'asc' ? 1 : -1, totalReviews: order === 'asc' ? 1 : -1 }; break;
    case 'popular': sort = { totalBookings: order === 'asc' ? 1 : -1, averageRating: order === 'asc' ? 1 : -1 }; break;
    default: sort = { createdAt: order === 'asc' ? 1 : -1 };
  }

  const [items, total] = await Promise.all([
    Service.find(filter)
      .populate('provider', 'businessName description profileImage experienceYears averageRating totalReviews verificationStatus serviceAreas')
      .populate('category', 'name slug icon image isActive')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);
  const publicItems = items.map((service) => ({
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
    category: service.category,
    provider: service.provider ? {
      _id: service.provider._id,
      businessName: service.provider.businessName,
      description: service.provider.description,
      profileImage: service.provider.profileImage,
      experienceYears: service.provider.experienceYears,
      verificationStatus: service.provider.verificationStatus,
      serviceAreas: service.provider.serviceAreas,
      averageRating: service.provider.averageRating,
      totalReviews: service.provider.totalReviews,
    } : undefined,
  }));
  return { items: publicItems, total };
}

export async function listCategories({ page, limit, search, sortBy, order }) {
  const filter = { isActive: true };
  if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [categories, total] = await Promise.all([
    Category.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);
  if (categories.length === 0) return { items: [], total };

  const categoryIds = categories.map(({ _id }) => _id);
  const activeUsers = await User.find({ role: 'PROVIDER', status: 'ACTIVE' }).select('_id').lean();
  const providers = await ProviderProfile.find({
    user: { $in: activeUsers.map(({ _id }) => _id) },
    verificationStatus: 'VERIFIED',
  }).select('_id').lean();
  const counts = await Service.aggregate([
    { $match: { isActive: true, category: { $in: categoryIds }, provider: { $in: providers.map(({ _id }) => _id) } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countsByCategory = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));
  return {
    items: categories.map((category) => ({
      ...category,
      serviceCount: countsByCategory.get(category._id.toString()) ?? 0,
    })),
    total,
  };
}

export async function countDiscoverableByCategoryIds(categoryIds) {
  if (categoryIds.length === 0) return [];
  const activeUsers = await User.find({ role: 'PROVIDER', status: 'ACTIVE' }).select('_id').lean();
  const providers = await ProviderProfile.find({
    user: { $in: activeUsers.map(({ _id }) => _id) },
    verificationStatus: 'VERIFIED',
  }).select('_id').lean();
  return Service.aggregate([
    {
      $match: {
        isActive: true,
        category: { $in: categoryIds },
        provider: { $in: providers.map(({ _id }) => _id) },
      },
    },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
}
