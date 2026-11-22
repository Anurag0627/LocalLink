import mongoose from 'mongoose';
import * as reviewRepository from '../repositories/review.repository.js';
import * as providerProfileRepository from '../repositories/providerProfile.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import { recalculateAggregates, getProviderRatings } from './rating.service.js';
import * as notificationService from './notification.service.js';

function sanitizePublicReview(review) {
  const value = review.toObject ? review.toObject() : { ...review };
  delete value.status;
  delete value.reportCount;
  delete value.moderationReason;
  delete value.moderatedBy;
  delete value.moderatedAt;
  delete value.deletedAt;
  delete value.deletedBy;
  delete value.__v;
  if (value.customer) {
    value.customer = {
      _id: value.customer._id,
      firstName: value.customer.firstName,
      lastName: value.customer.lastName,
    };
  }
  return value;
}

function paginate(items, total, query) {
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function createReview(user, data) {
  requireRole(user, 'CUSTOMER');
  const booking = await reviewRepository.findBookingForReview(data.booking);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customer.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Only the customer who made the booking can review it');
  }
  if (booking.status !== 'COMPLETED') {
    throw new ApiError(400, 'Only completed bookings can be reviewed');
  }
  if (!booking.provider || !booking.service) {
    throw new ApiError(400, 'The booking has missing provider or service information');
  }
  if (booking.provider.user?.toString() === user._id.toString()) {
    throw new ApiError(400, 'Customers cannot review their own services');
  }
  if (await reviewRepository.findByBookingId(booking._id)) {
    throw new ApiError(409, 'A review already exists for this booking');
  }

  let review;
  try {
    review = await reviewRepository.create({
      booking: booking._id,
      customer: user._id,
      provider: booking.provider._id,
      service: booking.service._id,
      rating: data.rating,
      comment: data.comment,
      images: data.images,
      status: 'PUBLISHED',
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'A review already exists for this booking');
    }
    throw error;
  }

  await recalculateAggregates(booking.provider._id, booking.service._id);
  const populated = await reviewRepository.findPublicById(review._id);
  await notificationService.createNotification({
    recipient: booking.provider.user,
    actor: user._id,
    type: 'REVIEW_RECEIVED',
    title: 'New review received',
    message: 'A customer published a review for your service.',
    resourceType: 'REVIEW',
    resourceId: review._id,
    metadata: { rating: review.rating, serviceId: review.service },
    eventKey: `REVIEW_RECEIVED:${review._id}`,
  });
  return sanitizePublicReview(populated ?? review);
}

export async function listProviderReviews(providerId, query) {
  if (!mongoose.isValidObjectId(providerId)) throw new ApiError(400, 'Invalid provider ID');
  const result = await reviewRepository.listPublic({
    providerId,
    page: query.page,
    limit: query.limit,
    rating: query.rating,
    sortBy: query.sortBy,
  });
  return paginate(result.items.map(sanitizePublicReview), result.total, query);
}

export async function listServiceReviews(serviceId, query) {
  if (!mongoose.isValidObjectId(serviceId)) throw new ApiError(400, 'Invalid service ID');
  const result = await reviewRepository.listPublic({
    serviceId,
    page: query.page,
    limit: query.limit,
    rating: query.rating,
    sortBy: query.sortBy,
  });
  return paginate(result.items.map(sanitizePublicReview), result.total, query);
}

export async function getPublicReview(reviewId) {
  const review = await reviewRepository.findPublicById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');
  return sanitizePublicReview(review);
}

export async function listMyReviews(user, query) {
  requireRole(user, 'CUSTOMER');
  let sortBy = 'createdAt';
  let order = query.order ?? 'desc';
  if (query.sortBy === 'highest') {
    sortBy = 'rating';
    order = 'desc';
  } else if (query.sortBy === 'lowest') {
    sortBy = 'rating';
    order = 'asc';
  } else if (query.sortBy === 'oldest') {
    sortBy = 'createdAt';
    order = 'asc';
  }
  const result = await reviewRepository.listMine({
    customerId: user._id,
    page: query.page,
    limit: query.limit,
    rating: query.rating,
    sortBy,
    order,
  });
  return paginate(result.items, result.total, query);
}

export async function updateReview(user, reviewId, data) {
  requireRole(user, 'CUSTOMER');
  const review = await reviewRepository.findOwnedReview(user._id, reviewId);
  if (!review) throw new ApiError(404, 'Review not found');

  const updated = await reviewRepository.updateById(reviewId, {
    $set: data,
  });
  if (!updated) throw new ApiError(404, 'Review not found');
  await recalculateAggregates(updated.provider, updated.service);
  return sanitizePublicReview(updated);
}

export async function deleteReview(user, reviewId) {
  requireRole(user, 'CUSTOMER');
  const review = await reviewRepository.findOwnedReview(user._id, reviewId);
  if (!review) throw new ApiError(404, 'Review not found');
  const deleted = await reviewRepository.softDelete(reviewId, user._id);
  if (!deleted) throw new ApiError(409, 'Review has already been deleted');
  await recalculateAggregates(deleted.provider, deleted.service);
  return { reviewId: deleted._id };
}

export async function reportReview(user, reviewId, data) {
  requireAuthenticatedActive(user);
  const review = await reviewRepository.findById(reviewId);
  if (!review || review.deletedAt) throw new ApiError(404, 'Review not found');
  if (review.customer.toString() === user._id.toString()) {
    throw new ApiError(400, 'Users cannot report their own review');
  }
  if (await reviewRepository.findReport(reviewId, user._id)) {
    throw new ApiError(409, 'You have already reported this review');
  }
  try {
    await reviewRepository.createReport({
      review: reviewId,
      reporter: user._id,
      reason: data.reason,
      description: data.description,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'You have already reported this review');
    }
    throw error;
  }
  await reviewRepository.incrementReportCount(reviewId);
  return { reviewId };
}

function requireAuthenticatedActive(user) {
  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Authentication required');
  }
}

export async function listProviderOwnedReviews(user, query) {
  requireRole(user, 'PROVIDER');
  const provider = await reviewRepository.findProviderByUserId(user._id);
  if (!provider) throw new ApiError(404, 'Provider profile not found');
  let sortBy = 'createdAt';
  let order = query.order ?? 'desc';
  if (query.sortBy === 'highest') {
    sortBy = 'rating';
    order = 'desc';
  } else if (query.sortBy === 'lowest') {
    sortBy = 'rating';
    order = 'asc';
  } else if (query.sortBy === 'oldest') {
    sortBy = 'createdAt';
    order = 'asc';
  }
  const result = await reviewRepository.listProvider({
    providerId: provider._id,
    page: query.page,
    limit: query.limit,
    rating: query.rating,
    sortBy,
    order,
  });
  return paginate(result.items, result.total, query);
}

export async function listProviderOwnedRatings(user) {
  requireRole(user, 'PROVIDER');
  const provider = await providerProfileRepository.findByUserId(user._id);
  if (!provider) throw new ApiError(404, 'Provider profile not found');
  return getProviderRatings(provider._id);
}

export async function listAdminReviews(user, query) {
  requireRole(user, 'ADMIN');
  const result = await reviewRepository.listAdmin(query);
  return paginate(result.items, result.total, query);
}

export async function moderateReview(user, reviewId, data) {
  requireRole(user, 'ADMIN');
  const review = await reviewRepository.findById(reviewId);
  if (!review || review.deletedAt) throw new ApiError(404, 'Review not found');
  const statusChanged = review.status !== data.status;
  const updated = await reviewRepository.updateById(reviewId, {
    $set: {
      status: data.status,
      moderationReason: data.reason,
      moderatedBy: user._id,
      moderatedAt: new Date(),
    },
  });
  if (!updated) throw new ApiError(404, 'Review not found');
  if (statusChanged) {
    await recalculateAggregates(updated.provider, updated.service);
    await notificationService.createNotification({
      recipient: updated.customer,
      type: data.status === 'HIDDEN' ? 'REVIEW_HIDDEN' : 'REVIEW_RESTORED',
      title: data.status === 'HIDDEN' ? 'Review hidden' : 'Review restored',
      message: data.status === 'HIDDEN'
        ? 'Your review was hidden by an administrator.'
        : 'Your review was restored by an administrator.',
      resourceType: 'REVIEW',
      resourceId: updated._id,
      metadata: { status: updated.status },
      eventKey: `${data.status === 'HIDDEN' ? 'REVIEW_HIDDEN' : 'REVIEW_RESTORED'}:${updated._id}`,
    });
  }
  return updated.toJSON();
}
