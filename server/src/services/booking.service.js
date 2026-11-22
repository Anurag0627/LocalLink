import * as bookingRepository from '../repositories/booking.repository.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as customerProfileRepository from '../repositories/customerProfile.repository.js';
import * as providerProfileRepository from '../repositories/providerProfile.repository.js';
import * as serviceRepository from '../repositories/service.repository.js';
import ApiError from '../utils/ApiError.js';
import { requireRole } from '../utils/authorization.utils.js';
import {
  intervalsOverlap,
  isServiceAreaEligible,
  parseAppointment,
  timeToMinutes,
  validateAvailability,
  validateFutureAppointment,
} from './bookingScheduling.service.js';
import * as notificationService from './notification.service.js';

function scheduledDateValue(value) {
  if (value instanceof Date) return value;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function scheduledDateEndValue(value) {
  const date = scheduledDateValue(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function serializeAddress(address) {
  const value = address.toObject ? address.toObject() : { ...address };
  delete value._id;
  return value;
}

function serializeLocation(service, provider) {
  const area = (service.serviceAreas ?? [])[0] ?? (provider.serviceAreas ?? [])[0];
  if (!area) return undefined;
  const value = area.toObject ? area.toObject() : { ...area };
  delete value._id;
  return value;
}

async function resolveCustomer(user) {
  requireRole(user, 'CUSTOMER');
  const profile = await customerProfileRepository.findByUserId(user._id);
  if (!profile) throw new ApiError(404, 'Customer profile not found');
  return profile;
}

async function resolveVerifiedProvider(user) {
  requireRole(user, 'PROVIDER');
  const profile = await providerProfileRepository.findByUserId(user._id);
  if (!profile) throw new ApiError(404, 'Provider profile not found');
  if (profile.verificationStatus !== 'VERIFIED') {
    throw new ApiError(403, 'Only verified providers can manage bookings');
  }
  const account = await accountRepository.findById(user._id);
  if (!account || account.status !== 'ACTIVE') {
    throw new ApiError(403, 'Provider account is not active');
  }
  return profile;
}

async function resolveBookingConflict(providerId, scheduledDate, scheduledTime, duration, excludedId) {
  const conflicts = await bookingRepository.findConflictingBookings(providerId, scheduledDate);
  const requestedStart = timeToMinutes(scheduledTime);
  const conflict = conflicts.find((booking) =>
    booking._id.toString() !== excludedId?.toString()
    && intervalsOverlap(requestedStart, duration, booking.scheduledTime, booking.duration));
  if (conflict) throw new ApiError(409, 'The appointment conflicts with an existing booking');
}

async function ensureServiceEligible(service) {
  if (!service || !service.isActive) throw new ApiError(404, 'Service is unavailable');
  if (!service.category?.isActive) throw new ApiError(404, 'Service category is inactive');
  if (!service.provider) throw new ApiError(404, 'Provider not found');
  if (service.provider.verificationStatus !== 'VERIFIED') {
    throw new ApiError(403, 'Provider is not verified');
  }
  const providerUser = await accountRepository.findById(service.provider.user);
  if (!providerUser || providerUser.status !== 'ACTIVE') {
    throw new ApiError(403, 'Provider account is unavailable');
  }
  return service.provider;
}

export async function createBooking(user, data) {
  const customerProfile = await resolveCustomer(user);
  const service = await serviceRepository.findForBooking(data.service);
  const provider = await ensureServiceEligible(service);

  if (provider.user.toString() === user._id.toString()) {
    throw new ApiError(400, 'Customers cannot book their own services');
  }

  validateFutureAppointment(data.scheduledDate, data.scheduledTime);
  const duration = validateAvailability(service, data.scheduledDate, data.scheduledTime);
  const scheduledDate = scheduledDateValue(data.scheduledDate);

  let address;
  let locationSnapshot;
  if (service.serviceLocationType === 'AT_CUSTOMER_LOCATION') {
    if (!data.addressId) throw new ApiError(400, 'A saved address is required');
    const selectedAddress = customerProfile.addresses.id(data.addressId);
    if (!selectedAddress) throw new ApiError(404, 'Address not found');
    if (!isServiceAreaEligible(service.serviceLocationType, service, selectedAddress.toObject())) {
      throw new ApiError(400, 'The selected address is outside the service area');
    }
    address = serializeAddress(selectedAddress);
  } else if (service.serviceLocationType === 'AT_PROVIDER_LOCATION') {
    locationSnapshot = serializeLocation(service, provider);
  }

  await resolveBookingConflict(provider._id, scheduledDate, data.scheduledTime, duration);

  const createData = {
    customer: user._id,
    provider: provider._id,
    service: service._id,
    scheduledDate,
    scheduledTime: data.scheduledTime,
    duration,
    serviceSnapshot: {
      title: service.title,
      pricingType: service.pricingType,
      ...(service.price !== undefined ? { price: service.price } : {}),
    },
    ...(address ? { address } : {}),
    ...(locationSnapshot ? { locationSnapshot } : {}),
    customerNote: data.customerNote,
    status: 'PENDING',
    schedulingKey: `${provider._id.toString()}:${data.scheduledDate}:${data.scheduledTime}`,
  };

  let booking;
  try {
    booking = await bookingRepository.create(createData);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'The appointment slot is no longer available');
    }
    throw error;
  }
  await notificationService.createNotification({
    recipient: provider.user,
    actor: user._id,
    type: 'BOOKING_CREATED',
    title: 'New booking request',
    message: `A new booking request was created for ${service.title}.`,
    resourceType: 'BOOKING',
    resourceId: booking._id,
    metadata: { bookingNumber: booking.bookingNumber, status: booking.status },
    eventKey: `BOOKING_CREATED:${booking._id}`,
  });
  return booking;
}

export async function listCustomerBookings(user, query) {
  await resolveCustomer(user);
  const result = await bookingRepository.listCustomerBookings({
    customerId: user._id,
    ...query,
    dateFrom: query.dateFrom ? scheduledDateValue(query.dateFrom) : undefined,
    dateTo: query.dateTo ? scheduledDateEndValue(query.dateTo) : undefined,
  });
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

export async function getCustomerBooking(user, bookingId) {
  await resolveCustomer(user);
  const booking = await bookingRepository.findCustomerBooking(user._id, bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return booking.toJSON();
}

export async function cancelCustomerBooking(user, bookingId, reason) {
  await resolveCustomer(user);
  const booking = await bookingRepository.findCustomerBooking(user._id, bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
    throw new ApiError(400, 'This booking cannot be cancelled');
  }
  const updated = await bookingRepository.conditionalOwnedUpdate({
    bookingId,
    ownerField: 'customer',
    ownerId: user._id,
    expectedStatus: booking.status,
    update: {
      $set: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: 'CUSTOMER',
      },
    },
  });
  if (!updated) throw new ApiError(409, 'Booking state changed concurrently');
  const providerProfile = await providerProfileRepository.findById(booking.provider);
  await notificationService.createNotification({
    recipient: providerProfile?.user,
    actor: user._id,
    type: 'BOOKING_CANCELLED',
    title: 'Booking cancelled',
    message: 'A customer cancelled a booking.',
    resourceType: 'BOOKING',
    resourceId: updated._id,
    metadata: { bookingNumber: updated.bookingNumber, status: updated.status, cancelledBy: 'CUSTOMER' },
    eventKey: `BOOKING_CANCELLED:CUSTOMER:${updated._id}`,
  });
  return updated.toJSON();
}

export async function listProviderBookings(user, query) {
  const profile = await resolveVerifiedProvider(user);
  const result = await bookingRepository.listProviderBookings({
    providerId: profile._id,
    ...query,
    dateFrom: query.dateFrom ? scheduledDateValue(query.dateFrom) : undefined,
    dateTo: query.dateTo ? scheduledDateEndValue(query.dateTo) : undefined,
  });
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

export async function getProviderBooking(user, bookingId) {
  const profile = await resolveVerifiedProvider(user);
  const booking = await bookingRepository.findProviderBooking(profile._id, bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return booking.toJSON();
}

async function resolveProviderBooking(user, bookingId) {
  const profile = await resolveVerifiedProvider(user);
  const booking = await bookingRepository.findProviderBooking(profile._id, bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  return { profile, booking };
}

export async function acceptBooking(user, bookingId) {
  const { profile, booking } = await resolveProviderBooking(user, bookingId);
  if (booking.status !== 'PENDING') throw new ApiError(400, 'Only pending bookings can be accepted');

  const service = await serviceRepository.findForBooking(booking.service);
  await ensureServiceEligible(service);
  validateFutureAppointment(
    booking.scheduledDate.toISOString().slice(0, 10),
    booking.scheduledTime,
  );
  await resolveBookingConflict(profile._id, booking.scheduledDate, booking.scheduledTime, booking.duration, booking._id);

  const updated = await bookingRepository.conditionalOwnedUpdate({
    bookingId,
    ownerField: 'provider',
    ownerId: profile._id,
    expectedStatus: 'PENDING',
    update: { $set: { status: 'ACCEPTED' } },
  });
  if (!updated) throw new ApiError(409, 'Booking state changed concurrently');
  await notificationService.createNotification({
    recipient: booking.customer,
    actor: profile.user,
    type: 'BOOKING_ACCEPTED',
    title: 'Booking accepted',
    message: 'Your booking request was accepted.',
    resourceType: 'BOOKING',
    resourceId: updated._id,
    metadata: { bookingNumber: updated.bookingNumber, status: updated.status },
    eventKey: `BOOKING_ACCEPTED:${updated._id}`,
  });
  return updated.toJSON();
}

export async function rejectBooking(user, bookingId, reason) {
  const { profile, booking } = await resolveProviderBooking(user, bookingId);
  if (booking.status !== 'PENDING') throw new ApiError(400, 'Only pending bookings can be rejected');
  const updated = await bookingRepository.conditionalOwnedUpdate({
    bookingId,
    ownerField: 'provider',
    ownerId: profile._id,
    expectedStatus: 'PENDING',
    update: {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    },
  });
  if (!updated) throw new ApiError(409, 'Booking state changed concurrently');
  await notificationService.createNotification({
    recipient: booking.customer,
    actor: profile.user,
    type: 'BOOKING_REJECTED',
    title: 'Booking rejected',
    message: 'Your booking request was rejected.',
    resourceType: 'BOOKING',
    resourceId: updated._id,
    metadata: { bookingNumber: updated.bookingNumber, status: updated.status },
    eventKey: `BOOKING_REJECTED:${updated._id}`,
  });
  return updated.toJSON();
}

export async function cancelProviderBooking(user, bookingId, reason) {
  const { profile, booking } = await resolveProviderBooking(user, bookingId);
  if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
    throw new ApiError(400, 'This booking cannot be cancelled');
  }
  const updated = await bookingRepository.conditionalOwnedUpdate({
    bookingId,
    ownerField: 'provider',
    ownerId: profile._id,
    expectedStatus: booking.status,
    update: {
      $set: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: 'PROVIDER',
      },
    },
  });
  if (!updated) throw new ApiError(409, 'Booking state changed concurrently');
  await notificationService.createNotification({
    recipient: booking.customer,
    actor: profile.user,
    type: 'BOOKING_CANCELLED',
    title: 'Booking cancelled',
    message: 'The provider cancelled your booking.',
    resourceType: 'BOOKING',
    resourceId: updated._id,
    metadata: { bookingNumber: updated.bookingNumber, status: updated.status, cancelledBy: 'PROVIDER' },
    eventKey: `BOOKING_CANCELLED:PROVIDER:${updated._id}`,
  });
  return updated.toJSON();
}

export async function completeBooking(user, bookingId) {
  const { profile, booking } = await resolveProviderBooking(user, bookingId);
  if (booking.status !== 'ACCEPTED') {
    throw new ApiError(400, 'Only accepted bookings can be completed');
  }
  const start = parseAppointment(
    booking.scheduledDate.toISOString().slice(0, 10),
    booking.scheduledTime,
  );
  const end = new Date(start.getTime() + (booking.duration ?? 60) * 60 * 1000);
  if (end.getTime() > Date.now()) {
    throw new ApiError(400, 'The booking cannot be completed before the scheduled end time');
  }

  const updated = await bookingRepository.conditionalOwnedUpdate({
    bookingId,
    ownerField: 'provider',
    ownerId: profile._id,
    expectedStatus: 'ACCEPTED',
    update: { $set: { status: 'COMPLETED', completedAt: new Date() } },
  });
  if (!updated) throw new ApiError(409, 'Booking state changed concurrently');
  await providerProfileRepository.incrementCompletedBookings(profile._id);
  await notificationService.createNotification({
    recipient: booking.customer,
    actor: profile.user,
    type: 'BOOKING_COMPLETED',
    title: 'Booking completed',
    message: 'Your booking has been completed.',
    resourceType: 'BOOKING',
    resourceId: updated._id,
    metadata: { bookingNumber: updated.bookingNumber, status: updated.status },
    eventKey: `BOOKING_COMPLETED:${updated._id}`,
  });
  return updated.toJSON();
}

export async function listProviderCalendar(user, query) {
  const profile = await resolveVerifiedProvider(user);
  return bookingRepository.findProviderAppointments({
    providerId: profile._id,
    dateFrom: query.dateFrom ? scheduledDateValue(query.dateFrom) : undefined,
    dateTo: query.dateTo ? scheduledDateEndValue(query.dateTo) : undefined,
    status: query.status,
  });
}
