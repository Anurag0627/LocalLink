import Booking from '../models/booking.model.js';

export function findById(bookingId) {
  return Booking.findById(bookingId);
}

export function findCustomerBooking(customerId, bookingId) {
  return Booking.findOne({ _id: bookingId, customer: customerId });
}

export function findProviderBooking(providerId, bookingId) {
  return Booking.findOne({ _id: bookingId, provider: providerId });
}

export function create(data) {
  return Booking.create(data);
}

export async function listCustomerBookings({ customerId, page, limit, status, dateFrom, dateTo, sortBy, order }) {
  const filter = { customer: customerId };
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.scheduledDate = {};
    if (dateFrom) filter.scheduledDate.$gte = dateFrom;
    if (dateTo) filter.scheduledDate.$lte = dateTo;
  }
  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listProviderBookings({ providerId, page, limit, status, dateFrom, dateTo, sortBy, order }) {
  const filter = { provider: providerId };
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.scheduledDate = {};
    if (dateFrom) filter.scheduledDate.$gte = dateFrom;
    if (dateTo) filter.scheduledDate.$lte = dateTo;
  }
  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return { items, total };
}

export function findConflictingBookings(providerId, scheduledDate) {
  return Booking.find({
    provider: providerId,
    scheduledDate,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  }).select('scheduledTime duration status').lean();
}

export function conditionalUpdate(bookingId, expectedStatus, update) {
  return Booking.findOneAndUpdate(
    { _id: bookingId, status: expectedStatus },
    update,
    { returnDocument: 'after', runValidators: true },
  );
}

export function conditionalOwnedUpdate({ bookingId, ownerField, ownerId, expectedStatus, update }) {
  return Booking.findOneAndUpdate(
    {
      _id: bookingId,
      [ownerField]: ownerId,
      status: expectedStatus,
    },
    update,
    { returnDocument: 'after', runValidators: true },
  );
}

export async function findProviderAppointments({ providerId, dateFrom, dateTo, status }) {
  const filter = { provider: providerId };
  if (dateFrom || dateTo) {
    filter.scheduledDate = {};
    if (dateFrom) filter.scheduledDate.$gte = dateFrom;
    if (dateTo) filter.scheduledDate.$lte = dateTo;
  }
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $nin: ['REJECTED', 'CANCELLED'] };
  }
  return Booking.find(filter)
    .select('scheduledDate scheduledTime duration serviceSnapshot status')
    .sort({ scheduledDate: 1, scheduledTime: 1 })
    .lean();
}
