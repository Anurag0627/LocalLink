import api from '../../../lib/api.js';

export function createBooking(data) {
  return api.post('/bookings', data);
}

export function getMyBookings(params = {}) {
  return api.get('/bookings/my', { params });
}

export function getMyBookingById(bookingId) {
  return api.get(`/bookings/${bookingId}`);
}

export function cancelMyBooking(bookingId, reason) {
  return api.patch(`/bookings/${bookingId}/cancel`, { reason });
}

export function getIncomingBookings(params = {}) {
  return api.get('/provider/bookings', { params });
}

export function getProviderBookingById(bookingId) {
  return api.get(`/provider/bookings/${bookingId}`);
}

export function acceptBooking(bookingId) {
  return api.patch(`/provider/bookings/${bookingId}/accept`);
}

export function rejectBooking(bookingId, reason) {
  return api.patch(`/provider/bookings/${bookingId}/reject`, { reason });
}

export function cancelProviderBooking(bookingId, reason) {
  return api.patch(`/provider/bookings/${bookingId}/cancel`, { reason });
}

export function completeBooking(bookingId) {
  return api.patch(`/provider/bookings/${bookingId}/complete`);
}

export function getProviderSchedule(params = {}) {
  return api.get('/provider/bookings/calendar', { params });
}

export function getCustomerAddresses() {
  return api.get('/customers/addresses');
}
