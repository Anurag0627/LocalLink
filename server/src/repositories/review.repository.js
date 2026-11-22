import Booking from '../models/booking.model.js';
import ProviderProfile from '../models/providerProfile.model.js';
import Review from '../models/review.model.js';
import ReviewReport from '../models/reviewReport.model.js';
import Service from '../models/service.model.js';

export function findBookingForReview(bookingId) {
  return Booking.findById(bookingId)
    .populate({ path: 'provider', select: 'user' })
    .populate({ path: 'service', select: '_id' });
}

export function findById(reviewId) {
  return Review.findById(reviewId);
}

export function findByBookingId(bookingId) {
  return Review.findOne({ booking: bookingId });
}

export function findOwnedReview(customerId, reviewId) {
  return Review.findOne({
    _id: reviewId,
    customer: customerId,
    deletedAt: null,
  });
}

export function create(data) {
  return Review.create(data);
}

export function updateById(reviewId, update) {
  return Review.findByIdAndUpdate(
    reviewId,
    update,
    { returnDocument: 'after', runValidators: true },
  );
}

export function softDelete(reviewId, customerId) {
  return Review.findOneAndUpdate(
    { _id: reviewId, customer: customerId, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: customerId } },
    { returnDocument: 'after', runValidators: true },
  );
}

function reviewSort(sortBy) {
  switch (sortBy) {
    case 'oldest':
      return { createdAt: 1 };
    case 'highest':
      return { rating: -1, createdAt: -1 };
    case 'lowest':
      return { rating: 1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

function publicReviewFilter() {
  return { status: 'PUBLISHED', deletedAt: null };
}

export async function listPublic({ providerId, serviceId, page, limit, rating, sortBy }) {
  const filter = publicReviewFilter();
  if (providerId) filter.provider = providerId;
  if (serviceId) filter.service = serviceId;
  if (rating !== undefined) filter.rating = rating;

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'customer', select: 'firstName lastName _id' })
      .populate({ path: 'service', select: 'title slug' })
      .sort(reviewSort(sortBy))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export function findPublicById(reviewId) {
  return Review.findOne({ _id: reviewId, ...publicReviewFilter() })
    .populate({ path: 'customer', select: 'firstName lastName _id' })
    .populate({ path: 'service', select: 'title slug' })
    .populate({ path: 'provider', select: 'businessName profileImage' });
}

export async function listMine({ customerId, page, limit, rating, sortBy, order }) {
  const filter = { customer: customerId, deletedAt: null };
  if (rating !== undefined) filter.rating = rating;
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'service', select: 'title slug' })
      .populate({ path: 'provider', select: 'businessName profileImage' })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listProvider({ providerId, page, limit, rating, sortBy, order }) {
  const filter = { provider: providerId, status: 'PUBLISHED', deletedAt: null };
  if (rating !== undefined) filter.rating = rating;
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'customer', select: 'firstName lastName _id' })
      .populate({ path: 'service', select: 'title slug' })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listAdmin({ page, limit, status, rating, reported, sortBy, order }) {
  const filter = { deletedAt: null };
  if (status) filter.status = status;
  if (rating !== undefined) filter.rating = rating;
  if (reported === 'true') filter.reportCount = { $gt: 0 };
  if (reported === 'false') filter.reportCount = 0;
  const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'customer', select: 'firstName lastName email role status' })
      .populate({ path: 'provider', select: 'businessName user' })
      .populate({ path: 'service', select: 'title slug' })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { items, total };
}

export function createReport(data) {
  return ReviewReport.create(data);
}

export function findReport(reviewId, reporterId) {
  return ReviewReport.findOne({ review: reviewId, reporter: reporterId });
}

export function incrementReportCount(reviewId) {
  return Review.findByIdAndUpdate(
    reviewId,
    { $inc: { reportCount: 1 } },
    { returnDocument: 'after', runValidators: true },
  );
}

export function calculateRatingSummary(providerId, serviceId) {
  const providerFilter = { provider: providerId, status: 'PUBLISHED', deletedAt: null };
  const serviceFilter = { service: serviceId, status: 'PUBLISHED', deletedAt: null };
  return Promise.all([
    Review.aggregate([
      { $match: providerFilter },
      { $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 }, distribution: { $push: '$rating' } } },
    ]),
    Review.aggregate([
      { $match: serviceFilter },
      { $group: { _id: null, average: { $avg: '$rating' }, total: { $sum: 1 }, distribution: { $push: '$rating' } } },
    ]),
  ]);
}

export function updateProviderRating(providerId, averageRating, totalReviews) {
  return ProviderProfile.findByIdAndUpdate(
    providerId,
    { $set: { averageRating, totalReviews } },
    { returnDocument: 'after', runValidators: true },
  );
}

export function updateServiceRating(serviceId, averageRating, totalReviews) {
  return Service.findByIdAndUpdate(
    serviceId,
    { $set: { averageRating, totalReviews } },
    { returnDocument: 'after', runValidators: true },
  );
}

export function findProviderByUserId(userId) {
  return ProviderProfile.findOne({ user: userId });
}
