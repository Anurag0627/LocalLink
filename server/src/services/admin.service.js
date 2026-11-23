import ProviderProfile from '../models/providerProfile.model.js';
import * as adminRepository from '../repositories/admin.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';

function ensureAdmin(user) {
  requireRole(user, 'ADMIN');
}

function paginate(result, query) {
  return {
    items: result.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export function getDashboard(user) {
  ensureAdmin(user);
  return adminRepository.getDashboard();
}

export function listCustomers(user, query) {
  ensureAdmin(user);
  return adminRepository.listCustomers(query).then((result) => paginate(result, query));
}

export async function getCustomer(user, customerId) {
  ensureAdmin(user);
  const customer = await adminRepository.getCustomer(customerId);
  if (!customer) throw new ApiError(404, 'Customer not found');
  return customer;
}

export async function updateCustomerStatus(user, customerId, status) {
  ensureAdmin(user);
  if (user._id.toString() === customerId) {
    throw new ApiError(403, 'Administrators cannot change their own account status');
  }
  const updated = await adminRepository.updateUserStatus(customerId, status, 'CUSTOMER');
  if (!updated) throw new ApiError(404, 'Customer not found');
  return updated;
}

export function listProviders(user, query) {
  ensureAdmin(user);
  return adminRepository.listProviders(query).then((result) => paginate(result, query));
}

export async function getProvider(user, providerId) {
  ensureAdmin(user);
  const provider = await adminRepository.getProvider(providerId);
  if (!provider) throw new ApiError(404, 'Provider not found');
  return provider;
}

export async function updateProviderStatus(user, providerId, status) {
  ensureAdmin(user);
  const profile = await ProviderProfile.findById(providerId).select('user');
  if (!profile) throw new ApiError(404, 'Provider not found');
  if (profile.user.toString() === user._id.toString()) {
    throw new ApiError(403, 'Administrators cannot change their own account status');
  }
  const updated = await adminRepository.updateUserStatus(profile.user, status, 'PROVIDER');
  if (!updated) throw new ApiError(404, 'Provider account not found');
  return updated;
}

export async function updateProviderVerification(user, providerId, data) {
  ensureAdmin(user);
  const updated = await adminRepository.updateProviderVerification(
    providerId,
    data.verificationStatus,
    data.reason,
    user._id,
  );
  if (!updated) throw new ApiError(404, 'Provider not found');
  return updated;
}

export function listServices(user, query) {
  ensureAdmin(user);
  return adminRepository.listServices(query).then((result) => paginate(result, query));
}

export async function updateServiceStatus(user, serviceId, isActive) {
  ensureAdmin(user);
  const updated = await adminRepository.updateServiceStatus(serviceId, isActive);
  if (!updated) throw new ApiError(404, 'Service not found');
  return updated;
}

export function listCategories(user, query) {
  ensureAdmin(user);
  return adminRepository.listCategories(query).then((result) => paginate(result, query));
}

export function listBookings(user, query) {
  ensureAdmin(user);
  return adminRepository.listBookings(query).then((result) => paginate(result, query));
}

export async function getBooking(user, bookingId) {
  ensureAdmin(user);
  const booking = await adminRepository.getBooking(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return booking;
}

export function listReports(user, query) {
  ensureAdmin(user);
  return adminRepository.listReports(query).then((result) => paginate(result, query));
}
