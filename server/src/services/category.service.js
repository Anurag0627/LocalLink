import * as categoryRepository from '../repositories/category.repository.js';
import * as discoveryRepository from '../repositories/discovery.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import { slugify } from '../models/schemas/common.schemas.js';
import Service from '../models/service.model.js';

function serializeCategory(category) {
  const value = category.toJSON ? category.toJSON() : category;
  return value;
}

export async function listPublic(query) {
  const result = await categoryRepository.list(query);
  if (query.includeServiceCount && result.items.length > 0) {
    const ids = result.items.map((item) => item._id);
    const counts = await discoveryRepository.countDiscoverableByCategoryIds(ids);
    const byId = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));
    result.items = result.items.map((item) => ({
      ...item,
      serviceCount: byId.get(item._id.toString()) ?? 0,
    }));
  }
  return result;
}

export async function getPublicBySlug(slug) {
  const category = await categoryRepository.findBySlug(slug);
  if (!category || !category.isActive) throw new ApiError(404, 'Category not found');
  return serializeCategory(category);
}

async function ensureUniqueNameAndSlug(name, slug, excludedId) {
  const normalizedName = name.trim().toLowerCase();
  const [nameMatch, slugMatch] = await Promise.all([
    categoryRepository.findByName(normalizedName),
    categoryRepository.findBySlug(slug),
  ]);
  if (nameMatch && nameMatch._id.toString() !== excludedId?.toString()) {
    throw new ApiError(409, 'Category name already exists');
  }
  if (slugMatch && slugMatch._id.toString() !== excludedId?.toString()) {
    throw new ApiError(409, 'Category slug already exists');
  }
}

export async function createCategory(user, data) {
  requireRole(user, 'ADMIN');
  const name = data.name.trim().toLowerCase();
  const slug = slugify(name);
  await ensureUniqueNameAndSlug(name, slug);
  try {
    const createData = { ...data, name, slug, isActive: true };
    if (createData.image === null) delete createData.image;
    if (createData.description === null) delete createData.description;
    if (createData.icon === null) delete createData.icon;
    const category = await categoryRepository.create(createData);
    return serializeCategory(category);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'Category name or slug already exists');
    throw error;
  }
}

export async function updateCategory(user, categoryId, data) {
  requireRole(user, 'ADMIN');
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
  const update = {};
  for (const [field, value] of Object.entries(data)) {
    if (value !== undefined) update[field] = value;
  }
  if (update.name !== undefined) {
    update.name = update.name.trim().toLowerCase();
    update.slug = slugify(update.name);
  }
  await ensureUniqueNameAndSlug(update.name ?? category.name, update.slug ?? category.slug, categoryId);
  const set = {};
  const unset = {};
  for (const [field, value] of Object.entries(update)) {
    if (value === null) unset[field] = 1;
    else set[field] = value;
  }
  const operation = {};
  if (Object.keys(set).length > 0) operation.$set = set;
  if (Object.keys(unset).length > 0) operation.$unset = unset;
  try {
    const updated = await categoryRepository.updateById(categoryId, operation);
    return serializeCategory(updated);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'Category name or slug already exists');
    throw error;
  }
}

export async function updateCategoryStatus(user, categoryId, isActive) {
  requireRole(user, 'ADMIN');
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
  const updated = await categoryRepository.updateById(categoryId, { $set: { isActive } });
  return serializeCategory(updated);
}

export async function deleteCategory(user, categoryId) {
  requireRole(user, 'ADMIN');
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');
  const referenceCount = await Service.countDocuments({ category: categoryId });
  if (referenceCount > 0) {
    if (!category.isActive) {
      return { category: serializeCategory(category), deactivated: true, existingServiceCount: referenceCount };
    }
    await categoryRepository.updateById(categoryId, { $set: { isActive: false } });
    return {
      category: serializeCategory(await categoryRepository.findById(categoryId)),
      deactivated: true,
      existingServiceCount: referenceCount,
      message: 'Category could not be deleted because services reference it; it was safely deactivated',
    };
  }
  await categoryRepository.updateById(categoryId, { $set: { isActive: false } });
  return { category: serializeCategory(await categoryRepository.findById(categoryId)), deactivated: true, existingServiceCount: 0 };
}
