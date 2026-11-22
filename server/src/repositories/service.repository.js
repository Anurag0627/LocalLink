import Service from '../models/service.model.js';
import Category from '../models/category.model.js';
import mongoose from 'mongoose';

export function findById(serviceId) {
  return Service.findById(serviceId);
}

export function findForBooking(serviceId) {
  return Service.findById(serviceId)
    .populate('provider')
    .populate('category');
}

export function findOwnedById(serviceId, providerId) {
  return Service.findOne({ _id: serviceId, provider: providerId });
}

export function findByProviderAndSlug(providerId, slug) {
  return Service.findOne({ provider: providerId, slug });
}

export function create(data) {
  return Service.create(data);
}

export function updateById(serviceId, update) {
  return Service.findByIdAndUpdate(
    serviceId,
    update,
    { returnDocument: 'after', runValidators: true },
  );
}

export async function listForProvider({ providerId, page, limit, search, category, isActive, sortBy, order }) {
  const filter = { provider: providerId };
  if (search) {
    filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (category) {
    if (mongoose.isValidObjectId(category)) {
      filter.category = category;
    } else {
      const found = await Category.findOne({ slug: category }).select('_id').lean();
      filter.category = found?._id ?? null;
    }
  }
  if (isActive !== undefined) filter.isActive = isActive;
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Service.find(filter).populate('category', 'name slug isActive').sort(sort)
      .skip((page - 1) * limit).limit(limit).lean(),
    Service.countDocuments(filter),
  ]);
  return { items, total };
}
