import Category from '../models/category.model.js';

export function findById(categoryId) {
  return Category.findById(categoryId);
}

export function findBySlug(slug) {
  return Category.findOne({ slug });
}

export function findByName(name) {
  return Category.findOne({ name });
}

export function create(data) {
  return Category.create(data);
}

export function updateById(categoryId, update) {
  return Category.findByIdAndUpdate(
    categoryId,
    update,
    { returnDocument: 'after', runValidators: true },
  );
}

export async function list({ page, limit, search, sortBy, order }) {
  const filter = { isActive: true };
  if (search) {
    filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);
  return { items, total };
}
