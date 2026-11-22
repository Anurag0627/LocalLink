import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import argon2 from 'argon2';

const testMongoUri = process.env.PHASE6_TEST_MONGODB_URI;

if (!testMongoUri) {
  throw new Error(
    'Set PHASE6_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".',
  );
}

const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 6 validation only runs against a database whose name ends in "_test".');
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
  { createAccessToken },
] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/env.js'),
  import('../src/models/user.model.js'),
  import('../src/models/customerProfile.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/category.model.js'),
  import('../src/models/service.model.js'),
  import('../src/services/token.service.js'),
]);

const runId = randomUUID();
const prefix = `phase6-${runId}`;
const testEmails = [];
const fixtureUserIds = [];
const fixtureCategoryIds = [];
const fixtureServiceIds = [];
let server;
let connected = false;
const trustedOrigin = env.CLIENT_URL[0];

async function createFixtureUser({ role, status = 'ACTIVE', verificationStatus, name }) {
  const email = `${prefix}-${name}@example.test`;
  testEmails.push(email);
  const password = await argon2.hash('a-valid-phase6-password-123', {
    type: argon2.argon2id,
  });
  const user = await User.create({
    firstName: 'Phase',
    lastName: name,
    email,
    password,
    role,
    status,
    authVersion: 0,
  });
  fixtureUserIds.push(user._id);

  let profile;
  if (role === 'CUSTOMER') {
    profile = await CustomerProfile.create({ user: user._id });
  } else if (role === 'PROVIDER') {
    profile = await ProviderProfile.create({
      user: user._id,
      businessName: `${name} Services`,
      description: `${name} test provider`,
      experienceYears: 5,
      verificationStatus,
      isAvailable: true,
    });
  }

  return { user, profile, token: createAccessToken(user) };
}

async function createFixtureCategory(name, overrides = {}) {
  const category = await Category.create({
    name: `${prefix}-${name}`,
    description: 'Phase 6 integration category',
    isActive: true,
    displayOrder: 1,
    ...overrides,
  });
  fixtureCategoryIds.push(category._id);
  return category;
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

function serviceInput(category, overrides = {}) {
  return {
    category: category._id.toString(),
    title: `${prefix} Electrical Repair`,
    description: 'Electrical inspection and repair testing.',
    images: ['https://images.example.test/electrical.jpg'],
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
    ...overrides,
  };
}

async function validatePhase6() {
  await mongoose.connect(testMongoUri);
  connected = true;
  await Promise.all([
    User.init(),
    CustomerProfile.init(),
    ProviderProfile.init(),
    Category.init(),
    Service.init(),
  ]);

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const admin = await createFixtureUser({ role: 'ADMIN', name: 'admin' });
  const customer = await createFixtureUser({ role: 'CUSTOMER', name: 'customer' });
  const verified = await createFixtureUser({
    role: 'PROVIDER',
    name: 'verified',
    verificationStatus: 'VERIFIED',
  });
  const pending = await createFixtureUser({
    role: 'PROVIDER',
    name: 'pending',
    verificationStatus: 'PENDING',
  });
  const rejected = await createFixtureUser({
    role: 'PROVIDER',
    name: 'rejected',
    verificationStatus: 'REJECTED',
  });
  const suspended = await createFixtureUser({
    role: 'PROVIDER',
    name: 'suspended',
    status: 'SUSPENDED',
    verificationStatus: 'VERIFIED',
  });
  const otherVerified = await createFixtureUser({
    role: 'PROVIDER',
    name: 'other',
    verificationStatus: 'VERIFIED',
  });

  const category = await createFixtureCategory('electrical');
  const inactiveCategory = await createFixtureCategory('inactive', { isActive: false });

  const publicCategories = await request('/api/v1/categories');
  assert.equal(publicCategories.response.status, 200);
  assert.ok(publicCategories.payload.data.some((item) => item.slug === category.slug));
  assert.ok(!publicCategories.payload.data.some((item) => item._id === inactiveCategory._id.toString()));

  const publicCategory = await request(`/api/v1/categories/${category.slug}`);
  assert.equal(publicCategory.response.status, 200);
  assert.equal(publicCategory.payload.data.slug, category.slug);

  const unauthenticatedCreate = await request('/api/v1/categories', {
    method: 'POST',
    body: { name: 'Unauthorized Category' },
  });
  assert.equal(unauthenticatedCreate.response.status, 401);

  const customerCreate = await request('/api/v1/categories', {
    method: 'POST',
    token: customer.token,
    body: { name: 'Customer Category' },
  });
  assert.equal(customerCreate.response.status, 403);

  const adminCreate = await request('/api/v1/categories', {
    method: 'POST',
    token: admin.token,
    body: {
      name: `${prefix} Plumbing`,
      description: 'Phase 6 plumbing category',
      icon: 'wrench',
      image: 'https://images.example.test/plumbing.jpg',
      displayOrder: 2,
    },
  });
  assert.equal(adminCreate.response.status, 201);
  fixtureCategoryIds.push(new mongoose.Types.ObjectId(adminCreate.payload.data._id));
  const adminCategory = await Category.findById(adminCreate.payload.data._id);

  const duplicateCategory = await request('/api/v1/categories', {
    method: 'POST',
    token: admin.token,
    body: { name: `${prefix} plumbing` },
  });
  assert.equal(duplicateCategory.response.status, 409);

  const updatedCategory = await request(`/api/v1/categories/${adminCategory._id}`, {
    method: 'PATCH',
    token: admin.token,
    body: { name: `${prefix} water plumbing`, displayOrder: 3 },
  });
  assert.equal(updatedCategory.response.status, 200);
  assert.equal(updatedCategory.payload.data.displayOrder, 3);

  const deactivatedCategory = await request(`/api/v1/categories/${adminCategory._id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { isActive: false },
  });
  assert.equal(deactivatedCategory.response.status, 200);
  assert.equal(deactivatedCategory.payload.data.isActive, false);

  await Category.findByIdAndUpdate(adminCategory._id, { $set: { isActive: true } });

  const pendingCreate = await request('/api/v1/services', {
    method: 'POST',
    token: pending.token,
    body: serviceInput(category, { title: `${prefix} Pending Service` }),
  });
  assert.equal(pendingCreate.response.status, 403);

  const rejectedCreate = await request('/api/v1/services', {
    method: 'POST',
    token: rejected.token,
    body: serviceInput(category, { title: `${prefix} Rejected Service` }),
  });
  assert.equal(rejectedCreate.response.status, 403);

  const customerCreateService = await request('/api/v1/services', {
    method: 'POST',
    token: customer.token,
    body: serviceInput(category),
  });
  assert.equal(customerCreateService.response.status, 403);

  const inactiveCategoryCreate = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(inactiveCategory),
  });
  assert.equal(inactiveCategoryCreate.response.status, 400);

  const invalidFixed = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(category, { price: undefined, title: `${prefix} Invalid Fixed` }),
  });
  assert.equal(invalidFixed.response.status, 400);

  const invalidQuote = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(category, {
      pricingType: 'QUOTE',
      price: 100,
      title: `${prefix} Invalid Quote`,
    }),
  });
  assert.equal(invalidQuote.response.status, 400);

  const created = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(category),
  });
  assert.equal(created.response.status, 201);
  const createdServiceId = created.payload.data._id;
  fixtureServiceIds.push(new mongoose.Types.ObjectId(createdServiceId));

  const persisted = await Service.findById(createdServiceId);
  assert.ok(persisted);
  assert.equal(persisted.provider.toString(), verified.profile._id.toString());
  assert.equal(persisted.isActive, true);
  assert.equal(persisted.averageRating, 0);
  assert.equal(persisted.totalBookings, 0);

  const crossProviderUpdate = await request(`/api/v1/services/${createdServiceId}`, {
    method: 'PATCH',
    token: otherVerified.token,
    body: { title: 'Unauthorized Update' },
  });
  assert.equal(crossProviderUpdate.response.status, 404);

  const updatedService = await request(`/api/v1/services/${createdServiceId}`, {
    method: 'PATCH',
    token: verified.token,
    body: {
      title: `${prefix} Updated Electrical Repair`,
      description: 'Updated repair description.',
      pricingType: 'QUOTE',
      price: null,
      estimatedDuration: 90,
    },
  });
  assert.equal(updatedService.response.status, 200);
  const updatedPersisted = await Service.findById(createdServiceId);
  assert.equal(updatedPersisted.title, `${prefix} Updated Electrical Repair`);
  assert.equal(updatedPersisted.pricingType, 'QUOTE');
  assert.equal(updatedPersisted.price, undefined);
  assert.equal(updatedPersisted.estimatedDuration, 90);

  const invalidProtectedUpdate = await request(`/api/v1/services/${createdServiceId}`, {
    method: 'PATCH',
    token: verified.token,
    body: { averageRating: 5, provider: otherVerified.profile._id.toString() },
  });
  assert.equal(invalidProtectedUpdate.response.status, 400);

  const secondCategory = await createFixtureCategory('second');
  const serviceTwo = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(secondCategory, {
      title: `${prefix} Plumbing Maintenance`,
      description: 'Pipe maintenance in Mumbai.',
      pricingType: 'HOURLY',
      price: 800,
      serviceAreas: [{
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCodes: ['400001'],
      }],
    }),
  });
  assert.equal(serviceTwo.response.status, 201);
  fixtureServiceIds.push(new mongoose.Types.ObjectId(serviceTwo.payload.data._id));

  await Service.findByIdAndUpdate(createdServiceId, {
    $set: { averageRating: 4.8, totalReviews: 12, totalBookings: 20 },
  });

  const inactiveService = await request('/api/v1/services', {
    method: 'POST',
    token: verified.token,
    body: serviceInput(category, {
      title: `${prefix} Inactive Service`,
    }),
  });
  assert.equal(inactiveService.response.status, 201);
  fixtureServiceIds.push(new mongoose.Types.ObjectId(inactiveService.payload.data._id));
  await request(`/api/v1/services/${inactiveService.payload.data._id}/status`, {
    method: 'PATCH',
    token: verified.token,
    body: { isActive: false },
  });

  const unverifiedService = await request('/api/v1/services', {
    method: 'POST',
    token: otherVerified.token,
    body: serviceInput(category, { title: `${prefix} Unlisted Cross Service` }),
  });
  assert.equal(unverifiedService.response.status, 201);
  fixtureServiceIds.push(new mongoose.Types.ObjectId(unverifiedService.payload.data._id));
  await ProviderProfile.findByIdAndUpdate(
    otherVerified.profile._id,
    { $set: { verificationStatus: 'REJECTED' } },
  );

  const suspendedInput = serviceInput(category, {
    title: `${prefix} Suspended Provider Service`,
  });
  const suspendedServiceDocument = await Service.create({
    ...suspendedInput,
    provider: suspended.profile._id,
    slug: 'suspended-provider-service',
  });
  fixtureServiceIds.push(suspendedServiceDocument._id);

  await Category.findByIdAndUpdate(secondCategory._id, { $set: { isActive: false } });

  const discovery = await request('/api/v1/discovery/services');
  assert.equal(discovery.response.status, 200);
  const discoveryIds = discovery.payload.data.map((item) => item._id);
  assert.ok(discoveryIds.includes(createdServiceId));
  assert.ok(!discoveryIds.includes(inactiveService.payload.data._id));
  assert.ok(!discoveryIds.includes(unverifiedService.payload.data._id));
  assert.ok(!discoveryIds.includes(suspendedServiceDocument._id.toString()));
  assert.ok(!discoveryIds.includes(serviceTwo.payload.data._id));

  const search = await request(
    `/api/v1/discovery/services?search=${encodeURIComponent('Electrical')}&sortBy=rating&order=desc`,
  );
  assert.equal(search.response.status, 200);
  assert.ok(search.payload.data.length >= 1);

  const categoryFilter = await request(
    `/api/v1/discovery/services?category=${category.slug}`,
  );
  assert.equal(categoryFilter.response.status, 200);
  assert.ok(categoryFilter.payload.data.every((item) => item.category.slug === category.slug));

  const cityFilter = await request(
    '/api/v1/discovery/services?city=Karad',
  );
  assert.equal(cityFilter.response.status, 200);
  assert.ok(cityFilter.payload.data.every((item) =>
    item.serviceAreas.some((area) => area.city === 'Karad')));

  const priceFilter = await request(
    '/api/v1/discovery/services?minPrice=100&maxPrice=2000&pricingType=QUOTE',
  );
  assert.equal(priceFilter.response.status, 200);
  assert.ok(priceFilter.payload.data.every((item) => item.pricingType === 'QUOTE'));

  const paged = await request('/api/v1/discovery/services?page=1&limit=1&sortBy=popular');
  assert.equal(paged.response.status, 200);
  assert.equal(paged.payload.data.length, 1);
  assert.equal(paged.payload.meta.limit, 1);
  assert.equal(paged.payload.meta.page, 1);
  assert.ok(paged.payload.meta.totalPages >= 1);

  const detail = await request(`/api/v1/discovery/services/${createdServiceId}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.payload.data.service.title, `${prefix} Updated Electrical Repair`);
  assert.equal(detail.payload.data.provider.businessName, verified.profile.businessName);
  assert.equal(detail.payload.data.provider.email, undefined);
  assert.equal(detail.payload.data.provider.phone, undefined);
  assert.equal(detail.payload.data.provider.password, undefined);
  assert.equal(detail.payload.data.provider.user, undefined);
  assert.equal(detail.payload.data.category.slug, category.slug);

  const inactiveDetail = await request(
    `/api/v1/discovery/services/${inactiveService.payload.data._id}`,
  );
  assert.equal(inactiveDetail.response.status, 404);

  const deleted = await request(`/api/v1/services/${createdServiceId}`, {
    method: 'DELETE',
    token: verified.token,
  });
  assert.equal(deleted.response.status, 200);
  const deletedPersisted = await Service.findById(createdServiceId);
  assert.equal(deletedPersisted.isActive, false);

  const deletedDetail = await request(`/api/v1/discovery/services/${createdServiceId}`);
  assert.equal(deletedDetail.response.status, 404);

  const safeCategoryDelete = await request(`/api/v1/categories/${category._id}`, {
    method: 'DELETE',
    token: admin.token,
  });
  assert.equal(safeCategoryDelete.response.status, 200);
  const referencedCategory = await Category.findById(category._id);
  assert.equal(referencedCategory.isActive, false);

  const mine = await request('/api/v1/services/mine', {
    token: verified.token,
  });
  assert.equal(mine.response.status, 200);
  assert.ok(mine.payload.meta.total >= 3);

  console.log('Phase 6 database-backed integration validation checks passed.');
}

try {
  await validatePhase6();
} finally {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (connected) {
    await Service.deleteMany({
      $or: [
        { _id: { $in: fixtureServiceIds } },
      ],
    });
    await CustomerProfile.deleteMany({ user: { $in: fixtureUserIds } });
    await ProviderProfile.deleteMany({ user: { $in: fixtureUserIds } });
    await Category.deleteMany({ _id: { $in: fixtureCategoryIds } });
    await User.deleteMany({ _id: { $in: fixtureUserIds } });
    await mongoose.disconnect();
  }
}
