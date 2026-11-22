import api from '../../../lib/api.js';

export function getProviderProfile() {
  return api.get('/providers/profile');
}

export function updateProviderProfile(data) {
  return api.patch('/providers/profile', data);
}

export function getProviderServices(params = {}) {
  return api.get('/services/mine', { params });
}

export function getProviderServiceById(serviceId) {
  return api.get(`/services/${serviceId}`);
}

export function createProviderService(data) {
  return api.post('/services', data);
}

export function updateProviderService(serviceId, data) {
  return api.patch(`/services/${serviceId}`, data);
}

export function activateProviderService(serviceId) {
  return api.patch(`/services/${serviceId}/status`, { isActive: true });
}

export function deactivateProviderService(serviceId) {
  return api.patch(`/services/${serviceId}/status`, { isActive: false });
}

export function deleteProviderService(serviceId) {
  return api.delete(`/services/${serviceId}`);
}

export function getProviderAvailability() {
  return api.get('/providers/profile');
}

export function updateProviderAvailability(isAvailable) {
  return api.patch('/providers/availability', { isAvailable });
}

export function getProviderServiceAreas() {
  return api.get('/providers/service-areas');
}

export function createProviderServiceArea(data) {
  return api.post('/providers/service-areas', data);
}

export function updateProviderServiceArea(areaId, data) {
  return api.patch(`/providers/service-areas/${areaId}`, data);
}

export function deleteProviderServiceArea(areaId) {
  return api.delete(`/providers/service-areas/${areaId}`);
}

export function getActiveCategories(params = {}) {
  return api.get('/categories', { params: { limit: 100, includeServiceCount: 'false', ...params } });
}
