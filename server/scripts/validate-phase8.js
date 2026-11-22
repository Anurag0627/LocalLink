import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import argon2 from 'argon2';

const testMongoUri = process.env.PHASE8_TEST_MONGODB_URI;
if (!testMongoUri) {
  throw new Error('Set PHASE8_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".');
}
const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 8 validation only runs against a database whose name ends in "_test".');
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
  { default: ReviewReport },
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
  import('../src/models/reviewReport.model.js'),
  import('../src/services/token.service.js'),
]);

let server;
let baseUrl;
const runId = randomUUID();
const createdIds = [];
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
    lastName: 'Eight',
    email: `${runId}-${suffix}@example.test`,
    password: await argon2.hash('a-valid-phase8-password'),
    role,
  });
  createdIds.push({ model: User, id: user._id });
  return user;
}

async function refreshRatingDocuments(providerId, serviceId) {
  return Promise.all([
    ProviderProfile.findById(providerId).lean(),
    Service.findById(serviceId).lean(),
  ]);
}

try {
  await mongoose.connect(testMongoUri);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const customer = await createUser('CUSTOMER', 'customer');
  const secondCustomer = await createUser('CUSTOMER', 'second');
  const providerUser = await createUser('PROVIDER', 'provider');
  const admin = await createUser('ADMIN', 'admin');
  const customerProfile = await CustomerProfile.create({ user: customer._id });
  const secondCustomerProfile = await CustomerProfile.create({ user: secondCustomer._id });
  const provider = await ProviderProfile.create({
    user: providerUser._id,
    businessName: `Phase 8 ${runId}`,
    experienceYears: 3,
    verificationStatus: 'VERIFIED',
  });
  createdIds.push(
    { model: CustomerProfile, id: customerProfile._id },
    { model: CustomerProfile, id: secondCustomerProfile._id },
    { model: ProviderProfile, id: provider._id },
  );

  const category = await Category.create({
    name: `Phase8 ${runId}`,
    slug: `phase8-${runId}`,
    isActive: true,
  });
  createdIds.push({ model: Category, id: category._id });
  const service = await Service.create({
    provider: provider._id,
    category: category._id,
    title: 'Phase 8 Review Service',
    description: 'Database-backed review validation service',
    pricingType: 'FIXED',
    price: 100,
    estimatedDuration: 60,
    serviceLocationType: 'REMOTE',
  });
  createdIds.push({ model: Service, id: service._id });

  const completedBooking = await Booking.create({
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    scheduledDate: new Date('2026-01-01T00:00:00.000Z'),
    scheduledTime: '10:00',
    duration: 60,
    serviceSnapshot: { title: service.title, pricingType: 'FIXED', price: 100 },
    status: 'COMPLETED',
  });
  const pendingBooking = await Booking.create({
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    scheduledDate: new Date('2026-01-02T00:00:00.000Z'),
    scheduledTime: '11:00',
    duration: 60,
    serviceSnapshot: { title: service.title, pricingType: 'FIXED', price: 100 },
    status: 'PENDING',
  });
  createdIds.push(
    { model: Booking, id: completedBooking._id },
    { model: Booking, id: pendingBooking._id },
  );

  const customerToken = createAccessToken(customer);
  const secondCustomerToken = createAccessToken(secondCustomer);
  const providerToken = createAccessToken(providerUser);
  const adminToken = createAccessToken(admin);

  const pending = await request('POST', '/reviews', customerToken, {
    booking: pendingBooking._id.toString(),
    rating: 5,
    comment: 'Should be rejected',
  });
  assert.equal(pending.status, 400);

  const unrelated = await request('POST', '/reviews', secondCustomerToken, {
    booking: completedBooking._id.toString(),
    rating: 5,
  });
  assert.equal(unrelated.status, 403);

  const created = await request('POST', '/reviews', customerToken, {
    booking: completedBooking._id.toString(),
    rating: 5,
    comment: 'Excellent service',
    images: ['https://example.com/review.jpg'],
  });
  assert.equal(created.status, 201);
  const reviewId = created.payload.data._id;
  createdIds.push({ model: Review, id: new mongoose.Types.ObjectId(reviewId) });

  const duplicate = await request('POST', '/reviews', customerToken, {
    booking: completedBooking._id.toString(),
    rating: 4,
  });
  assert.equal(duplicate.status, 409);

  const updated = await request('PATCH', `/reviews/${reviewId}`, customerToken, {
    rating: 3,
    comment: 'Updated review',
  });
  assert.equal(updated.status, 200);

  let [providerAggregate, serviceAggregate] = await refreshRatingDocuments(provider._id, service._id);
  assert.equal(providerAggregate.averageRating, 3);
  assert.equal(serviceAggregate.averageRating, 3);
  assert.equal(providerAggregate.totalReviews, 1);
  assert.equal(serviceAggregate.totalReviews, 1);

  const hide = await request(
    'PATCH',
    `/admin/reviews/${reviewId}/moderation`,
    adminToken,
    { status: 'HIDDEN', reason: 'Abusive content test' },
  );
  assert.equal(hide.status, 200);
  [providerAggregate, serviceAggregate] = await refreshRatingDocuments(provider._id, service._id);
  assert.equal(providerAggregate.averageRating, 0);
  assert.equal(providerAggregate.totalReviews, 0);
  assert.equal(serviceAggregate.averageRating, 0);
  assert.equal(serviceAggregate.totalReviews, 0);

  const publicHidden = await request('GET', `/reviews/${reviewId}`);
  assert.equal(publicHidden.status, 404);

  const restore = await request(
    'PATCH',
    `/admin/reviews/${reviewId}/moderation`,
    adminToken,
    { status: 'PUBLISHED', reason: 'Moderation restored' },
  );
  assert.equal(restore.status, 200);
  [providerAggregate, serviceAggregate] = await refreshRatingDocuments(provider._id, service._id);
  assert.equal(providerAggregate.averageRating, 3);
  assert.equal(serviceAggregate.averageRating, 3);

  const report = await request('POST', `/reviews/${reviewId}/report`, secondCustomerToken, {
    reason: 'SPAM',
    description: 'Test report',
  });
  assert.equal(report.status, 201);
  const duplicateReport = await request('POST', `/reviews/${reviewId}/report`, secondCustomerToken, {
    reason: 'SPAM',
  });
  assert.equal(duplicateReport.status, 409);

  const ownReport = await request('POST', `/reviews/${reviewId}/report`, customerToken, {
    reason: 'OTHER',
  });
  assert.equal(ownReport.status, 400);
  createdIds.push({ model: ReviewReport, id: (await ReviewReport.findOne({ review: reviewId }))._id });

  const providerList = await request('GET', '/providers/reviews', providerToken);
  assert.equal(providerList.status, 200);
  const ratings = await request('GET', '/providers/ratings', providerToken);
  assert.equal(ratings.status, 200);
  assert.equal(ratings.payload.data.averageRating, 3);

  const providerEdit = await request('PATCH', `/reviews/${reviewId}`, providerToken, {
    rating: 1,
  });
  assert.equal(providerEdit.status, 403);

  const deleted = await request('DELETE', `/reviews/${reviewId}`, customerToken);
  assert.equal(deleted.status, 200);
  [providerAggregate, serviceAggregate] = await refreshRatingDocuments(provider._id, service._id);
  assert.equal(providerAggregate.averageRating, 0);
  assert.equal(serviceAggregate.averageRating, 0);
  assert.equal(providerAggregate.totalReviews, 0);
  assert.equal(serviceAggregate.totalReviews, 0);

  const doubleDelete = await request('DELETE', `/reviews/${reviewId}`, customerToken);
  assert.equal(doubleDelete.status, 404);

  console.log('Phase 8 database-backed integration validation checks passed.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const entry of [...createdIds].reverse()) {
    await entry.model.deleteMany({ _id: entry.id });
  }
  await ReviewReport.deleteMany({ review: createdIds.find(({ model }) => model === Review)?.id }).catch(() => {});
  await mongoose.disconnect();
}
