import api from '../../../lib/api.js';

export function createReview(data) {
  return api.post('/reviews', data);
}

export function getMyReviews(params = {}) {
  return api.get('/reviews/my', { params });
}

export function getReviewById(reviewId) {
  return api.get(`/reviews/${reviewId}`);
}

export function updateReview(reviewId, data) {
  return api.patch(`/reviews/${reviewId}`, data);
}

export function deleteReview(reviewId) {
  return api.delete(`/reviews/${reviewId}`);
}

export function getServiceReviews(serviceId, params = {}) {
  return api.get(`/reviews/services/${serviceId}`, { params });
}

export function getProviderReviews(providerId, params = {}) {
  return api.get(`/reviews/providers/${providerId}`, { params });
}

export function reportReview(reviewId, data) {
  return api.post(`/reviews/${reviewId}/report`, data);
}

export function getProviderOwnedReviews(params = {}) {
  return api.get('/providers/reviews', { params });
}

export function getProviderRatingSummary() {
  return api.get('/providers/ratings');
}
