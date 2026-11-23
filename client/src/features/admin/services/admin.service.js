import api from '../../../lib/api.js';

const unwrap = (response) => response.data.data;
const unwrapList = (response) => ({ items: response.data.data, meta: response.data.meta });

export async function getAdminDashboard() {
  return unwrap(await api.get('/admin/dashboard'));
}

export async function getAdminCustomers(params) {
  return unwrapList(await api.get('/admin/customers', { params }));
}

export async function getAdminCustomer(customerId) {
  return unwrap(await api.get(`/admin/customers/${customerId}`));
}

export async function updateAdminCustomerStatus(customerId, status) {
  return unwrap(await api.patch(`/admin/customers/${customerId}/status`, { status }));
}

export async function getAdminProviders(params) {
  return unwrapList(await api.get('/admin/providers', { params }));
}

export async function getAdminProvider(providerId) {
  return unwrap(await api.get(`/admin/providers/${providerId}`));
}

export async function updateAdminProviderStatus(providerId, status) {
  return unwrap(await api.patch(`/admin/providers/${providerId}/status`, { status }));
}

export async function updateProviderVerification(providerId, data) {
  return unwrap(await api.patch(`/admin/providers/${providerId}/verification`, data));
}

export async function getAdminServices(params) {
  return unwrapList(await api.get('/admin/services', { params }));
}

export async function updateAdminServiceStatus(serviceId, isActive) {
  return unwrap(await api.patch(`/admin/services/${serviceId}/status`, { isActive }));
}

export async function getAdminBookings(params) {
  return unwrapList(await api.get('/admin/bookings', { params }));
}

export async function getAdminBooking(bookingId) {
  return unwrap(await api.get(`/admin/bookings/${bookingId}`));
}

export async function getAdminCategories(params) {
  return unwrapList(await api.get('/admin/categories', { params }));
}

export async function createAdminCategory(data) {
  return unwrap(await api.post('/categories', data));
}

export async function updateAdminCategory(categoryId, data) {
  return unwrap(await api.patch(`/categories/${categoryId}`, data));
}

export async function updateAdminCategoryStatus(categoryId, isActive) {
  return unwrap(await api.patch(`/categories/${categoryId}/status`, { isActive }));
}

export async function getAdminReports(params) {
  return unwrapList(await api.get('/admin/reports', { params }));
}

export async function getAdminReviews(params) {
  return unwrapList(await api.get('/admin/reviews', { params }));
}

export async function moderateAdminReview(reviewId, data) {
  return unwrap(await api.patch(`/admin/reviews/${reviewId}/moderation`, data));
}

