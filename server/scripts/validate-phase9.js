import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import argon2 from 'argon2';

const testMongoUri = process.env.PHASE9_TEST_MONGODB_URI;
if (!testMongoUri) throw new Error('Set PHASE9_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".');
const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 9 validation only runs against a database whose name ends in "_test".');
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = testMongoUri;
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET = randomBytes(64).toString('base64url');

const [
  { default: app },
  { default: User },
  { default: CustomerProfile },
  { default: ProviderProfile },
  { default: Category },
  { default: Service },
  { default: Booking },
  { default: Review },
  { default: Notification },
  { default: NotificationPreference },
  { createAccessToken },
] = await Promise.all([
  import('../src/app.js'),
  import('../src/models/user.model.js'),
  import('../src/models/customerProfile.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/category.model.js'),
  import('../src/models/service.model.js'),
  import('../src/models/booking.model.js'),
  import('../src/models/review.model.js'),
  import('../src/models/notification.model.js'),
  import('../src/models/notificationPreference.model.js'),
  import('../src/services/token.service.js'),
]);

let server;
let baseUrl;
const runId = randomUUID();
const fixtureIds = [];
const trustedOrigin = 'http://localhost:5173';

async function request(method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Origin: trustedOrigin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function createUser(role, suffix) {
  const user = await User.create({
    firstName: 'Phase',
    lastName: 'Nine',
    email: `${runId}-${suffix}@example.test`,
    password: await argon2.hash('a-valid-phase9-password'),
    role,
  });
  fixtureIds.push({ model: User, id: user._id });
  return user;
}

try {
  await mongoose.connect(testMongoUri);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const customer = await createUser('CUSTOMER', 'customer');
  const customerTwo = await createUser('CUSTOMER', 'customer-two');
  const providerUser = await createUser('PROVIDER', 'provider');
  const admin = await createUser('ADMIN', 'admin');
  const customerProfile = await CustomerProfile.create({ user: customer._id });
  fixtureIds.push({ model: CustomerProfile, id: customerProfile._id });
  const provider = await ProviderProfile.create({
    user: providerUser._id,
    businessName: `Phase9 ${runId}`,
    experienceYears: 4,
    verificationStatus: 'VERIFIED',
  });
  fixtureIds.push({ model: ProviderProfile, id: provider._id });
  const category = await Category.create({
    name: `Phase9 ${runId}`,
    slug: `phase9-${runId}`,
    isActive: true,
  });
  fixtureIds.push({ model: Category, id: category._id });
  const service = await Service.create({
    provider: provider._id,
    category: category._id,
    title: 'Phase 9 Notification Service',
    description: 'Notification integration validation',
    pricingType: 'FIXED',
    price: 90,
    estimatedDuration: 60,
    serviceLocationType: 'REMOTE',
    availability: [{
      day: 'TUESDAY',
      isAvailable: true,
      startTime: '09:00',
      endTime: '18:00',
    }],
  });
  fixtureIds.push({ model: Service, id: service._id });

  const customerToken = createAccessToken(customer);
  const customerTwoToken = createAccessToken(customerTwo);
  const providerToken = createAccessToken(providerUser);
  const adminToken = createAccessToken(admin);

  const preferences = await request('GET', '/notifications/preferences', customerToken);
  assert.equal(preferences.status, 200);
  assert.equal(preferences.payload.data.inAppEnabled, true);
  assert.equal(preferences.payload.data.bookingNotifications, true);

  const invalidPreferences = await request('PATCH', '/notifications/preferences', customerToken, {
    bookingNotifications: 'yes',
  });
  assert.equal(invalidPreferences.status, 400);

  const preferenceUpdate = await request('PATCH', '/notifications/preferences', customerToken, {
    bookingNotifications: false,
  });
  assert.equal(preferenceUpdate.status, 200);
  assert.equal(preferenceUpdate.payload.data.bookingNotifications, false);

  await NotificationPreference.create({
    user: providerUser._id,
    bookingNotifications: false,
  });

  const bookingCreate = await request('POST', '/bookings', customerToken, {
    service: service._id.toString(),
    scheduledDate: '2027-06-15',
    scheduledTime: '10:00',
  });
  assert.equal(bookingCreate.status, 201);
  const bookingId = bookingCreate.payload.data._id;
  fixtureIds.push({ model: Booking, id: new mongoose.Types.ObjectId(bookingId) });

  const suppressedProviderInbox = await request('GET', '/notifications', providerToken);
  assert.equal(suppressedProviderInbox.status, 200);
  assert.equal(suppressedProviderInbox.payload.data.length, 0);

  await NotificationPreference.updateOne(
    { user: customer._id },
    { $set: { bookingNotifications: true } },
  );
  await NotificationPreference.updateOne(
    { user: providerUser._id },
    { $set: { bookingNotifications: true } },
  );

  const accept = await request('PATCH', `/provider/bookings/${bookingId}/accept`, providerToken);
  assert.equal(accept.status, 200);

  const customerInbox = await request('GET', '/notifications', customerToken);
  assert.equal(customerInbox.status, 200);
  assert.equal(customerInbox.payload.data.some((item) => item.type === 'BOOKING_ACCEPTED'), true);

  const unreadCount = await request('GET', '/notifications/unread-count', customerToken);
  assert.equal(unreadCount.status, 200);
  assert.equal(unreadCount.payload.data.count, 1);

  const firstNotification = customerInbox.payload.data.find((item) => item.type === 'BOOKING_ACCEPTED');
  assert.ok(firstNotification);
  const markRead = await request('PATCH', `/notifications/${firstNotification._id}/read`, customerToken);
  assert.equal(markRead.status, 200);
  assert.equal(markRead.payload.data.isRead, true);

  const unreadOnly = await request('GET', '/notifications?unreadOnly=true', customerToken);
  assert.equal(unreadOnly.status, 200);
  assert.equal(unreadOnly.payload.data.every((item) => item.isRead === false), true);

  const filtered = await request('GET', '/notifications?type=BOOKING_ACCEPTED', customerToken);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.payload.data.every((item) => item.type === 'BOOKING_ACCEPTED'), true);

  const otherUserGet = await request('GET', `/notifications/${firstNotification._id}`, customerTwoToken);
  assert.equal(otherUserGet.status, 404);
  const otherUserRead = await request('PATCH', `/notifications/${firstNotification._id}/read`, customerTwoToken);
  assert.equal(otherUserRead.status, 404);
  const otherUserDelete = await request('DELETE', `/notifications/${firstNotification._id}`, customerTwoToken);
  assert.equal(otherUserDelete.status, 404);

  const unauthenticated = await request('GET', '/notifications');
  assert.equal(unauthenticated.status, 401);

  const markAll = await request('PATCH', '/notifications/read-all', customerToken);
  assert.equal(markAll.status, 200);
  const deleted = await request('DELETE', `/notifications/${firstNotification._id}`, customerToken);
  assert.equal(deleted.status, 200);

  const pagination = await request('GET', '/notifications?page=1&limit=1', customerToken);
  assert.equal(pagination.status, 200);
  assert.equal(pagination.payload.meta.limit, 1);
  assert.ok(pagination.payload.meta.totalPages >= 0);

  const providerInboxBeforeReview = await request('GET', '/notifications', providerToken);
  const providerCountBeforeReview = providerInboxBeforeReview.payload.meta.total;

  const completedBooking = await Booking.create({
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    scheduledDate: new Date('2026-01-01T00:00:00.000Z'),
    scheduledTime: '09:00',
    duration: 60,
    serviceSnapshot: { title: service.title, pricingType: 'FIXED', price: 90 },
    status: 'COMPLETED',
  });
  fixtureIds.push({ model: Booking, id: completedBooking._id });

  const reviewCreate = await request('POST', '/reviews', customerToken, {
    booking: completedBooking._id.toString(),
    rating: 5,
    comment: 'Excellent Phase 9 service',
  });
  assert.equal(reviewCreate.status, 201);
  const reviewId = reviewCreate.payload.data._id;
  fixtureIds.push({ model: Review, id: new mongoose.Types.ObjectId(reviewId) });

  const providerInboxAfterReview = await request('GET', '/notifications', providerToken);
  assert.equal(providerInboxAfterReview.payload.meta.total, providerCountBeforeReview + 1);

  const hide = await request(
    'PATCH',
    `/admin/reviews/${reviewId}/moderation`,
    adminToken,
    { status: 'HIDDEN', reason: 'Phase 9 moderation test' },
  );
  assert.equal(hide.status, 200);
  const restore = await request(
    'PATCH',
    `/admin/reviews/${reviewId}/moderation`,
    adminToken,
    { status: 'PUBLISHED', reason: 'Phase 9 restoration test' },
  );
  assert.equal(restore.status, 200);

  const authorInbox = await request('GET', '/notifications', customerToken);
  assert.equal(authorInbox.payload.data.some((item) => item.type === 'REVIEW_HIDDEN'), true);
  assert.equal(authorInbox.payload.data.some((item) => item.type === 'REVIEW_RESTORED'), true);

  console.log('Phase 9 database-backed notification integration validation checks passed.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await Notification.deleteMany({
    $or: fixtureIds.map(({ id }) => ({ $or: [{ recipient: id }, { resourceId: id }] })),
  }).catch(() => {});
  await NotificationPreference.deleteMany({
    user: { $in: fixtureIds.filter(({ model }) => model === User).map(({ id }) => id) },
  }).catch(() => {});
  for (const entry of [...fixtureIds].reverse()) {
    await entry.model.deleteMany({ _id: entry.id });
  }
  await mongoose.disconnect();
}
