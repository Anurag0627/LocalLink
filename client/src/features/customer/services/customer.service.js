import api from '../../../lib/api.js';

export function getCustomerProfile() {
  return api.get('/customers/profile');
}

export function updateCustomerProfile(data) {
  return api.patch('/customers/profile', data);
}

export function getCustomerAddresses() {
  return api.get('/customers/addresses');
}

export function addCustomerAddress(data) {
  return api.post('/customers/addresses', data);
}

export function updateCustomerAddress(addressId, data) {
  return api.patch(`/customers/addresses/${addressId}`, data);
}

export function deleteCustomerAddress(addressId) {
  return api.delete(`/customers/addresses/${addressId}`);
}

export function setCustomerDefaultAddress(addressId) {
  return api.patch(`/customers/addresses/${addressId}/default`);
}

export function getCategories(params = {}) {
  return api.get('/categories', { params });
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
