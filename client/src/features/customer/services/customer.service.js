import api from '../../../lib/api.js';

export function getCategories(params = {}) {
  return api.get('/discovery/categories', { params });
}

export function getCategoryById(categoryId) {
  return api.get(`/categories/${categoryId}`);
}

export function getServices(params = {}) {
  return api.get('/discovery/services', { params });
}

export function getServiceById(serviceId) {
  return api.get(`/discovery/services/${serviceId}`);
}

export function getProviderReviews(providerId, params = {}) {
  return api.get(`/reviews/providers/${providerId}`, { params });
}

export function getProviderById(providerId) {
  return api.get(`/discovery/providers/${providerId}`);
}

export function getProviderServices(providerId, params = {}) {
  return api.get(`/discovery/providers/${providerId}/services`, { params });
}

export function getServiceReviews(serviceId, params = {}) {
  return api.get(`/reviews/services/${serviceId}`, { params });
}
