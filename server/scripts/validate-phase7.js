import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const testMongoUri = process.env.PHASE7_TEST_MONGODB_URI;
if (!testMongoUri) {
  throw new Error('Set PHASE7_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".');
}
const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 7 validation only runs against a database whose name ends in "_test".');
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = testMongoUri;
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET = randomBytes(64).toString('base64url');
process.env.COOKIE_NAME = 'locallink_refresh_token';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';

const [
  { default: app },
  { env },
  { default: User },
  { default: CustomerProfile },
  { default: ProviderProfile },
  { default: Category },
  { default: Service },
  { default: Booking },
  { createAccessToken },
] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/env.js'),
  import('../src/models/user.model.js'),
  import('../src/models/customerProfile.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/category.model.js'),
  import('../src/models/service.model.js'),
  import('../src/models/booking.model.js'),
  import('../src/services/token.service.js'),
]);

const runId = randomUUID();
const prefix = `phase7-${runId}`;
const fixtureUserIds = [];
const fixtureCategoryIds = [];
const fixtureServiceIds = [];
const fixtureBookingIds = [];
let server;
let connected = false;
const trustedOrigin = env.CLIENT_URL[0];

async function createUser({ role, status = 'ACTIVE', verificationStatus }) {
  const user = await User.create({
    firstName: 'Phase',
    lastName: 'Seven',
    email: `${prefix}-${role}-${randomUUID()}@example.test`,
    password: 'a-valid-phase7-password-123',
    role,
    status,
  });
  fixtureUserIds.push(user._id);

  let profile;
  if (role === 'CUSTOMER') {
    profile = await CustomerProfile.create({
      user: user._id,
      addresses: [{
        label: 'Home',
        fullAddress: '100 Test Road',
        street: '100 Test Road',
        city: 'Karad',
        state: 'Maharashtra',
        postalCode: '415110',
        country: 'India',
      }],
    });
  } else if (role === 'PROVIDER') {
    profile = await ProviderProfile.create({
      user: user._id,
      businessName: `${prefix} Services`,
      description: 'Phase 7 test provider',
      experienceYears: 4,
      verificationStatus,
      isAvailable: true,
      serviceAreas: [{
        city: 'Karad',
        state: 'Maharashtra',
        country: 'India',
        postalCodes: ['415110'],
      }],
    });
  }
  return { user, profile, token: createAccessToken(user) };
}

async function request(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { Origin: trustedOrigin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, payload: await response.json() };
}

function nextWeekday(weekdayNumber = 1) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  const delta = (weekdayNumber - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

async function createCategory() {
  const category = await Category.create({
    name: `${prefix}-electrical`,
    description: 'Phase 7 test category',
    isActive: true,
  });
  fixtureCategoryIds.push(category._id);
  return category;
}

async function createService({ provider, category, overrides = {} }) {
  const service = await Service.create({
    provider: provider.profile._id,
    category: category._id,
    title: `${prefix} Electrical Repair`,
    description: 'Repair and inspection.',
    images: [],
    pricingType: 'FIXED',
    price: 1500,
    estimatedDuration: 120,
    serviceLocationType: 'AT_CUSTOMER_LOCATION',
    serviceAreas: [{
      city: 'Karad',
      state: 'Maharashtra',
      country: 'India',
      postalCodes: ['415110'],
    }],
    availability: [{
      day: 'MONDAY',
      isAvailable: true,
      startTime: '09:00',
      endTime: '17:00',
    }],
    isActive: true,
    ...overrides,
  });
  fixtureServiceIds.push(service._id);
  return service;
}

async function validatePhase7() {
  await mongoose.connect(testMongoUri);
  connected = true;
  await Promise.all([
    User.init(),
    CustomerProfile.init(),
    ProviderProfile.init(),
    Category.init(),
    Service.init(),
    Booking.init(),
  ]);

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const customer = await createUser({ role: 'CUSTOMER' });
  const otherCustomer = await createUser({ role: 'CUSTOMER' });
  const provider = await createUser({ role: 'PROVIDER', verificationStatus: 'VERIFIED' });
  const otherProvider = await createUser({ role: 'PROVIDER', verificationStatus: 'VERIFIED' });
  const pendingProvider = await createUser({ role: 'PROVIDER', verificationStatus: 'PENDING' });
  const rejectedProvider = await createUser({ role: 'PROVIDER', verificationStatus: 'REJECTED' });
  const suspendedProvider = await createUser({
    role: 'PROVIDER',
    status: 'SUSPENDED',
    verificationStatus: 'VERIFIED',
  });
  const category = await createCategory();
  const service = await createService({ provider, category });
  const addressId = customer.profile.addresses[0]._id.toString();
  const appointmentDate = nextWeekday(1);

  const unauthenticated = await request('/api/v1/bookings', {
    method: 'POST',
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(unauthenticated.response.status, 401);

  const providerCreate = await request('/api/v1/bookings', {
    method: 'POST',
    token: provider.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(providerCreate.response.status, 403);

  const ownService = await createService({
    provider,
    category,
    overrides: { title: `${prefix} Own Service` },
  });
  const ownCustomer = await createUser({ role: 'CUSTOMER' });
  await ProviderProfile.findByIdAndUpdate(provider.profile._id, {
    $set: { user: ownCustomer.user._id },
  });
  const ownBooking = await request('/api/v1/bookings', {
    method: 'POST',
    token: ownCustomer.token,
    body: {
      service: ownService._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '11:00',
      addressId: ownCustomer.profile.addresses[0]?._id?.toString(),
    },
  });
  assert.equal(ownBooking.response.status, 400);
  await ProviderProfile.findByIdAndUpdate(provider.profile._id, {
    $set: { user: provider.user._id },
  });

  const inactiveService = await createService({
    provider,
    category,
    overrides: { title: `${prefix} Inactive`, isActive: false },
  });
  const inactiveResult = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: inactiveService._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(inactiveResult.response.status, 404);

  const pendingService = await createService({
    provider: pendingProvider,
    category,
    overrides: { title: `${prefix} Pending Provider` },
  });
  const pendingResult = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: pendingService._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(pendingResult.response.status, 403);

  const rejectedService = await createService({
    provider: rejectedProvider,
    category,
    overrides: { title: `${prefix} Rejected Provider` },
  });
  const rejectedResult = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: rejectedService._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(rejectedResult.response.status, 403);

  const suspendedService = await createService({
    provider: suspendedProvider,
    category,
    overrides: { title: `${prefix} Suspended Provider` },
  });
  const suspendedResult = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: suspendedService._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(suspendedResult.response.status, 403);

  const invalidDate = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: '2020-01-01',
      scheduledTime: '10:30',
      addressId,
    },
  });
  assert.equal(invalidDate.response.status, 400);

  const invalidAddress = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId: new mongoose.Types.ObjectId().toString(),
    },
  });
  assert.equal(invalidAddress.response.status, 404);

  const outsideAvailability = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '08:30',
      addressId,
    },
  });
  assert.equal(outsideAvailability.response.status, 400);

  const created = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:30',
      addressId,
      customerNote: 'Please call on arrival.',
    },
  });
  assert.equal(created.response.status, 201);
  const bookingId = created.payload.data._id;
  fixtureBookingIds.push(new mongoose.Types.ObjectId(bookingId));
  const persisted = await Booking.findById(bookingId);
  assert.equal(persisted.status, 'PENDING');
  assert.equal(persisted.bookingNumber.startsWith('LL-'), true);
  assert.equal(persisted.address.city, 'Karad');
  assert.equal(persisted.serviceSnapshot.title, service.title);
  assert.equal(persisted.duration, 120);
  assert.equal(persisted.customer.toString(), customer.user._id.toString());

  const overlapping = await request('/api/v1/bookings', {
    method: 'POST',
    token: otherCustomer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '11:30',
      addressId: otherCustomer.profile.addresses[0]?._id?.toString()
        ?? new mongoose.Types.ObjectId().toString(),
    },
  });
  assert.ok([404, 409].includes(overlapping.response.status));

  const conflictSameSlot = await Promise.all([
    request('/api/v1/bookings', {
      method: 'POST',
      token: customer.token,
      body: {
        service: service._id.toString(),
        scheduledDate: appointmentDate,
        scheduledTime: '14:00',
        addressId,
      },
    }),
    request('/api/v1/bookings', {
      method: 'POST',
      token: otherCustomer.token,
      body: {
        service: service._id.toString(),
        scheduledDate: appointmentDate,
        scheduledTime: '14:00',
        addressId: otherCustomer.profile.addresses[0]?._id?.toString()
          ?? new mongoose.Types.ObjectId().toString(),
      },
    }),
  ]);
  assert.equal(conflictSameSlot.filter(({ response }) => response.status === 201).length, 1);
  for (const result of conflictSameSlot) {
    if (result.response.status === 201) {
      fixtureBookingIds.push(new mongoose.Types.ObjectId(result.payload.data._id));
    }
  }

  const customerList = await request('/api/v1/bookings/my?page=1&limit=10&status=PENDING', {
    token: customer.token,
  });
  assert.equal(customerList.response.status, 200);
  assert.ok(customerList.payload.data.length >= 1);

  const crossCustomer = await request(`/api/v1/bookings/${bookingId}`, {
    token: otherCustomer.token,
  });
  assert.equal(crossCustomer.response.status, 404);

  const providerList = await request('/api/v1/provider/bookings', {
    token: provider.token,
  });
  assert.equal(providerList.response.status, 200);
  assert.ok(providerList.payload.data.length >= 1);

  const crossProvider = await request(`/api/v1/provider/bookings/${bookingId}`, {
    token: otherProvider.token,
  });
  assert.equal(crossProvider.response.status, 404);

  const repeatedAcceptance = await request(
    `/api/v1/provider/bookings/${bookingId}/accept`,
    { method: 'PATCH', token: provider.token },
  );
  assert.equal(repeatedAcceptance.response.status, 200);
  const repeatedAcceptanceAgain = await request(
    `/api/v1/provider/bookings/${bookingId}/accept`,
    { method: 'PATCH', token: provider.token },
  );
  assert.equal(repeatedAcceptanceAgain.response.status, 400);

  const rejectAccepted = await request(
    `/api/v1/provider/bookings/${bookingId}/reject`,
    {
      method: 'PATCH',
      token: provider.token,
      body: { reason: 'Not available.' },
    },
  );
  assert.equal(rejectAccepted.response.status, 400);

  const calendar = await request(
    `/api/v1/provider/bookings/calendar?dateFrom=${appointmentDate}&dateTo=${appointmentDate}`,
    { token: provider.token },
  );
  assert.equal(calendar.response.status, 200);
  assert.ok(calendar.payload.data.length >= 1);

  const cancellation = await request(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'Unable to attend.' },
  });
  assert.equal(cancellation.response.status, 200);
  assert.equal(cancellation.payload.data.status, 'CANCELLED');
  assert.equal(cancellation.payload.data.cancelledBy, 'CUSTOMER');
  const repeatedCancellation = await request(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'Again.' },
  });
  assert.equal(repeatedCancellation.response.status, 400);

  const rejectedBooking = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '12:00',
      addressId,
    },
  });
  assert.equal(rejectedBooking.response.status, 201);
  fixtureBookingIds.push(new mongoose.Types.ObjectId(rejectedBooking.payload.data._id));
  const rejectedAction = await request(
    `/api/v1/provider/bookings/${rejectedBooking.payload.data._id}/reject`,
    {
      method: 'PATCH',
      token: provider.token,
      body: { reason: 'Unavailable time.' },
    },
  );
  assert.equal(rejectedAction.response.status, 200);
  assert.equal(rejectedAction.payload.data.status, 'REJECTED');
  assert.equal(rejectedAction.payload.data.rejectionReason, 'Unavailable time.');

  const completedBooking = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '10:00',
      addressId,
    },
  });
  assert.equal(completedBooking.response.status, 201);
  fixtureBookingIds.push(new mongoose.Types.ObjectId(completedBooking.payload.data._id));
  await Booking.findByIdAndUpdate(completedBooking.payload.data._id, {
    $set: {
      scheduledDate: new Date('2020-01-06T00:00:00.000Z'),
      scheduledTime: '10:00',
      status: 'ACCEPTED',
      duration: 60,
    },
  });
  const complete = await request(
    `/api/v1/provider/bookings/${completedBooking.payload.data._id}/complete`,
    { method: 'PATCH', token: provider.token },
  );
  assert.equal(complete.response.status, 200);
  assert.equal(complete.payload.data.status, 'COMPLETED');
  const repeatedComplete = await request(
    `/api/v1/provider/bookings/${completedBooking.payload.data._id}/complete`,
    { method: 'PATCH', token: provider.token },
  );
  assert.equal(repeatedComplete.response.status, 400);
  const providerProfile = await ProviderProfile.findById(provider.profile._id);
  assert.equal(providerProfile.totalCompletedBookings, 1);

  await Service.findByIdAndUpdate(service._id, { $set: { title: 'Changed After Booking' } });
  const immutableSnapshot = await Booking.findById(bookingId);
  assert.equal(immutableSnapshot.serviceSnapshot.title, service.title);

  const providerCancel = await request('/api/v1/bookings', {
    method: 'POST',
    token: customer.token,
    body: {
      service: service._id.toString(),
      scheduledDate: appointmentDate,
      scheduledTime: '09:30',
      addressId,
    },
  });
  assert.equal(providerCancel.response.status, 201);
  fixtureBookingIds.push(new mongoose.Types.ObjectId(providerCancel.payload.data._id));
  const providerCancelled = await request(
    `/api/v1/provider/bookings/${providerCancel.payload.data._id}/cancel`,
    {
      method: 'PATCH',
      token: provider.token,
      body: { reason: 'Provider scheduling conflict.' },
    },
  );
  assert.equal(providerCancelled.response.status, 200);
  assert.equal(providerCancelled.payload.data.cancelledBy, 'PROVIDER');

  console.log('Phase 7 database-backed integration validation checks passed.');
}

try {
  await validatePhase7();
} finally {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (connected) {
    await Booking.deleteMany({ _id: { $in: fixtureBookingIds } });
    await Service.deleteMany({ _id: { $in: fixtureServiceIds } });
    await Category.deleteMany({ _id: { $in: fixtureCategoryIds } });
    await ProviderProfile.deleteMany({ user: { $in: fixtureUserIds } });
    await CustomerProfile.deleteMany({ user: { $in: fixtureUserIds } });
    await User.deleteMany({ _id: { $in: fixtureUserIds } });
    await mongoose.disconnect();
  }
}
