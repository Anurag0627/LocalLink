import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import argon2 from 'argon2';

const testMongoUri = process.env.PHASE11_TEST_MONGODB_URI;
if (!testMongoUri) throw new Error('Set PHASE11_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".');
const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 11 validation only runs against a database whose name ends in "_test".');
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = testMongoUri;
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET = randomBytes(64).toString('base64url');

const [
  { default: app },
  { default: User },
  { default: ProviderProfile },
  { default: Category },
  { default: Service },
] = await Promise.all([
  import('../src/app.js'),
  import('../src/models/user.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/category.model.js'),
  import('../src/models/service.model.js'),
]);

let server;
let baseUrl;
const runId = randomUUID();
const fixtureIds = [];
const trustedOrigin = 'http://localhost:5173';

async function request(method, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Origin: trustedOrigin },
  });
  return { status: response.status, payload: await response.json() };
}

async function createUser(suffix, role = 'PROVIDER', status = 'ACTIVE') {
  const user = await User.create({
    firstName: 'Phase',
    lastName: 'Eleven',
    email: `${runId}-${suffix}@example.test`,
    phone: '+15555550100',
    password: await argon2.hash('a-valid-phase11-password'),
    role,
    status,
  });
  fixtureIds.push({ model: User, id: user._id });
  return user;
}

async function createProvider(user, verificationStatus = 'VERIFIED') {
  const provider = await ProviderProfile.create({
    user: user._id,
    businessName: `Phase11 ${runId}`,
    description: 'Public provider description',
    experienceYears: 5,
    verificationStatus,
    serviceAreas: [{ city: 'Test City', state: 'TS', country: 'Test', postalCodes: ['11111'] }],
  });
  fixtureIds.push({ model: ProviderProfile, id: provider._id });
  return provider;
}

try {
  await mongoose.connect(testMongoUri);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const eligibleUser = await createUser('eligible');
  const eligibleProvider = await createProvider(eligibleUser);
  const unverifiedUser = await createUser('unverified');
  const unverifiedProvider = await createProvider(unverifiedUser, 'PENDING');
  const inactiveUser = await createUser('inactive', 'PROVIDER', 'INACTIVE');
  const inactiveProvider = await createProvider(inactiveUser);
  const suspendedUser = await createUser('suspended', 'PROVIDER', 'SUSPENDED');
  const suspendedProvider = await createProvider(suspendedUser);

  const activeCategory = await Category.create({
    name: `Phase11 Active ${runId}`,
    slug: `phase11-active-${runId}`,
    isActive: true,
  });
  const inactiveCategory = await Category.create({
    name: `Phase11 Inactive ${runId}`,
    slug: `phase11-inactive-${runId}`,
    isActive: false,
  });
  fixtureIds.push({ model: Category, id: activeCategory._id }, { model: Category, id: inactiveCategory._id });

  const activeService = await Service.create({
    provider: eligibleProvider._id,
    category: activeCategory._id,
    title: 'Active Provider Service',
    description: 'An active public service',
    pricingType: 'FIXED',
    price: 100,
    serviceLocationType: 'AT_CUSTOMER_LOCATION',
  });
  const secondActiveService = await Service.create({
    provider: eligibleProvider._id,
    category: activeCategory._id,
    title: 'Second Active Provider Service',
    description: 'Another active public service',
    pricingType: 'HOURLY',
    price: 25,
    serviceLocationType: 'REMOTE',
  });
  const inactiveService = await Service.create({
    provider: eligibleProvider._id,
    category: activeCategory._id,
    title: 'Inactive Provider Service',
    description: 'An inactive provider service',
    pricingType: 'FIXED',
    price: 50,
    serviceLocationType: 'REMOTE',
    isActive: false,
  });
  const inactiveCategoryService = await Service.create({
    provider: eligibleProvider._id,
    category: inactiveCategory._id,
    title: 'Inactive Category Service',
    description: 'A service under an inactive category',
    pricingType: 'FIXED',
    price: 75,
    serviceLocationType: 'REMOTE',
  });
  fixtureIds.push(
    { model: Service, id: activeService._id },
    { model: Service, id: secondActiveService._id },
    { model: Service, id: inactiveService._id },
    { model: Service, id: inactiveCategoryService._id },
  );

  const eligible = await request('GET', `/discovery/providers/${eligibleProvider._id}`);
  assert.equal(eligible.status, 200);
  assert.equal(eligible.payload.data.businessName, eligibleProvider.businessName);
  assert.equal(eligible.payload.data.verificationStatus, 'VERIFIED');
  assert.equal('email' in eligible.payload.data, false);
  assert.equal('phone' in eligible.payload.data, false);
  assert.equal('password' in eligible.payload.data, false);
  assert.equal('authVersion' in eligible.payload.data, false);

  const byUserId = await request('GET', `/discovery/providers/${eligibleUser._id}`);
  assert.equal(byUserId.status, 200);
  assert.equal(byUserId.payload.data._id, eligibleProvider._id.toString());

  const invalid = await request('GET', '/discovery/providers/not-an-object-id');
  assert.equal(invalid.status, 400);

  const nonexistent = await request('GET', '/discovery/providers/507f1f77bcf86cd799439011');
  assert.equal(nonexistent.status, 404);

  const unverified = await request('GET', `/discovery/providers/${unverifiedProvider._id}`);
  assert.equal(unverified.status, 404);
  const inactive = await request('GET', `/discovery/providers/${inactiveProvider._id}`);
  assert.equal(inactive.status, 404);
  const suspended = await request('GET', `/discovery/providers/${suspendedProvider._id}`);
  assert.equal(suspended.status, 404);

  const services = await request('GET', `/discovery/providers/${eligibleProvider._id}/services?page=1&limit=1&sortBy=newest`);
  assert.equal(services.status, 200);
  assert.equal(services.payload.data.length, 1);
  assert.equal(services.payload.meta.total, 2);
  assert.equal(services.payload.meta.totalPages, 2);
  assert.equal(services.payload.data[0].isActive, undefined);

  const pageTwo = await request('GET', `/discovery/providers/${eligibleProvider._id}/services?page=2&limit=1&sortBy=newest`);
  assert.equal(pageTwo.status, 200);
  assert.equal(pageTwo.payload.data.length, 1);
  assert.equal(pageTwo.payload.data[0]._id !== inactiveService._id.toString(), true);
  assert.equal(pageTwo.payload.data[0]._id !== inactiveCategoryService._id.toString(), true);

  const unavailableServices = await request('GET', `/discovery/providers/${unverifiedProvider._id}/services`);
  assert.equal(unavailableServices.status, 404);

  console.log('Phase 11 backend provider integration tests passed.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
}
