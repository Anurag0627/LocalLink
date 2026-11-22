import * as reviewRepository from '../repositories/review.repository.js';
import Review from '../models/review.model.js';

let recalculationQueue = Promise.resolve();

function roundedAverage(value) {
  return value === 0 ? 0 : Math.round((value + Number.EPSILON) * 100) / 100;
}

async function calculateOne(filter) {
  const [result] = await Review.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        total: { $sum: 1 },
      },
    },
  ]);
  const total = result?.total ?? 0;
  const distribution = {};
  for (let rating = 5; rating >= 1; rating -= 1) {
    distribution[`${rating}Star`] = await Review.countDocuments({
      ...filter,
      rating,
    });
  }
  return {
    averageRating: roundedAverage(result?.average ?? 0),
    totalReviews: total,
    ratingDistribution: {
      5: distribution['5Star'],
      4: distribution['4Star'],
      3: distribution['3Star'],
      2: distribution['2Star'],
      1: distribution['1Star'],
    },
  };
}

async function recalculatePair(providerId, serviceId) {
  const providerFilter = {
    provider: providerId,
    status: 'PUBLISHED',
    deletedAt: null,
  };
  const serviceFilter = {
    service: serviceId,
    status: 'PUBLISHED',
    deletedAt: null,
  };

  const [provider, service] = await Promise.all([
    calculateOne(providerFilter),
    calculateOne(serviceFilter),
  ]);

  await Promise.all([
    reviewRepository.updateProviderRating(
      providerId,
      provider.averageRating,
      provider.totalReviews,
    ),
    reviewRepository.updateServiceRating(
      serviceId,
      service.averageRating,
      service.totalReviews,
    ),
  ]);
}

export async function recalculateAggregates(providerId, serviceId) {
  const previous = recalculationQueue;
  let release;
  recalculationQueue = new Promise((resolve) => {
    release = resolve;
  });

  await previous.catch(() => {});
  try {
    await recalculatePair(providerId, serviceId);
  } finally {
    release();
  }
}

export async function getProviderRatings(providerId) {
  return calculateOne({
    provider: providerId,
    status: 'PUBLISHED',
    deletedAt: null,
  });
}
