import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import argon2 from 'argon2';

const testMongoUri = process.env.PHASE16_TEST_MONGODB_URI;
if (!testMongoUri) {
  throw new Error('Set PHASE16_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".');
}
const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];
if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Phase 16 validation only runs against a database whose name ends in "_test".');
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
let testCount = 0;
const runId = randomUUID();
const trustedOrigin = 'http://localhost:5173';

function check(condition, message) {
  testCount += 1;
  assert.ok(condition, message);
}

async function request(method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Origin: trustedOrigin,
      'X-Request-Id': `phase16-${runId}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, payload, headers: response.headers };
}

async function createUser(role, suffix, status = 'ACTIVE') {
  return User.create({
    firstName: 'Phase',
    lastName: 'Sixteen',
    email: `${runId}-${suffix}@example.test`,
    phone: '+15555550100',
    password: await argon2.hash('a-valid-phase16-password'),
    role,
    status,
  });
}

function forbiddenKeys(value) {
  if (!value || typeof value !== 'object') return [];
  const found = [];
  for (const [key, child] of Object.entries(value)) {
    if (['password', 'authVersion', 'refreshTokenHash', 'refreshToken', 'sessionData'].includes(key)) found.push(key);
    found.push(...forbiddenKeys(child));
  }
  return found;
}

try {
  await mongoose.connect(testMongoUri);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  const liveness = await request('GET', '/health/live');
  check(liveness.status === 200, 'Liveness probe returns process availability');
  check(liveness.payload.data.status === 'live', 'Liveness payload identifies live process');
  check(liveness.headers.get('x-request-id')?.startsWith('phase16-') === true, 'Liveness response echoes or generates request ID');
  const readiness = await request('GET', '/health/ready');
  check(readiness.status === 200, 'Readiness probe confirms database readiness');
  check(readiness.payload.data.status === 'ready', 'Readiness payload identifies ready API');

  const admin = await createUser('ADMIN', 'admin');
  const customer = await createUser('CUSTOMER', 'customer');
  const customerTwo = await createUser('CUSTOMER', 'customer-two');
  const providerUser = await createUser('PROVIDER', 'provider');
  const pendingUser = await createUser('PROVIDER', 'pending');
  const suspendedUser = await createUser('PROVIDER', 'suspended');

  const customerProfile = await CustomerProfile.create({ user: customer._id });
  const provider = await ProviderProfile.create({
    user: providerUser._id,
    businessName: `Phase16 Provider ${runId}`,
    description: 'Verified provider',
    experienceYears: 6,
    verificationStatus: 'VERIFIED',
  });
  const pendingProvider = await ProviderProfile.create({
    user: pendingUser._id,
    businessName: `Phase16 Pending ${runId}`,
    experienceYears: 2,
    verificationStatus: 'PENDING',
  });
  await ProviderProfile.create({
    user: suspendedUser._id,
    businessName: `Phase16 Suspended ${runId}`,
    verificationStatus: 'VERIFIED',
  });

  const category = await Category.create({
    name: `Phase16 Category ${runId}`,
    slug: `phase16-category-${runId}`,
    isActive: true,
  });
  const inactiveCategory = await Category.create({
    name: `Phase16 Inactive ${runId}`,
    slug: `phase16-inactive-${runId}`,
    isActive: false,
  });
  const service = await Service.create({
    provider: provider._id,
    category: category._id,
    title: `Phase16 Service ${runId}`,
    description: 'Phase 16 test service',
    pricingType: 'FIXED',
    price: 150,
    serviceLocationType: 'AT_CUSTOMER_LOCATION',
    isActive: true,
  });

  const booking = await Booking.create({
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:30',
    duration: 60,
    serviceSnapshot: {
      title: service.title,
      description: service.description,
      pricingType: 'FIXED',
      price: 150,
      serviceLocationType: 'AT_CUSTOMER_LOCATION',
    },
  });

  const review = await Review.create({
    booking: booking._id,
    customer: customer._id,
    provider: provider._id,
    service: service._id,
    rating: 5,
    comment: 'Excellent service',
  });
  await ReviewReport.create({
    review: review._id,
    reporter: customerTwo._id,
    reason: 'SPAM',
    description: 'Test report',
  });
  await Review.findByIdAndUpdate(review._id, { $set: { reportCount: 1 } });

  const adminToken = createAccessToken(admin);
  const customerToken = createAccessToken(customer);
  const providerToken = createAccessToken(providerUser);
  const pendingToken = createAccessToken(pendingUser);

  const endpointGroups = [
    '/admin/dashboard',
    '/admin/customers',
    '/admin/providers',
    '/admin/services',
    '/admin/bookings',
    '/admin/categories',
    '/admin/reviews',
    '/admin/reports',
  ];
  for (const path of endpointGroups) {
    const unauthenticated = await request('GET', path);
    check(unauthenticated.status === 401, `${path} rejected unauthenticated access`);

    const customerResponse = await request('GET', path, customerToken);
    check(customerResponse.status === 403, `${path} rejected CUSTOMER access`);

    const providerResponse = await request('GET', path, providerToken);
    check(providerResponse.status === 403, `${path} rejected PROVIDER access`);
  }

  const dashboard = await request('GET', '/admin/dashboard', adminToken);
  check(dashboard.status === 200, 'Admin can retrieve dashboard');
  check(dashboard.payload.data.statistics.totalCustomers >= 2, 'Dashboard customer count is real');
  check(dashboard.payload.data.statistics.totalProviders >= 3, 'Dashboard provider count is real');
  check(dashboard.payload.data.statistics.totalActiveServices >= 1, 'Dashboard service count is real');
  check(dashboard.payload.data.statistics.totalBookings >= 1, 'Dashboard booking count is real');

  const customers = await request('GET', `/admin/customers?page=1&limit=1&search=${encodeURIComponent(customer.firstName)}&status=ACTIVE&sortBy=createdAt&order=desc`, adminToken);
  check(customers.status === 200, 'Customer listing accepts whitelisted filters');
  check(customers.payload.meta.limit === 1, 'Customer pagination limit is enforced');
  check(customers.payload.data.every((item) => !Object.hasOwn(item, 'password')), 'Customer list excludes password');

  const invalidCustomerQuery = await request('GET', '/admin/customers?page=0&limit=500&sortBy=password', adminToken);
  check(invalidCustomerQuery.status === 400, 'Invalid customer pagination and sort are rejected');

  const customerDetail = await request('GET', `/admin/customers/${customer._id}`, adminToken);
  check(customerDetail.status === 200, 'Admin can retrieve customer detail');
  check(forbiddenKeys(customerDetail.payload.data).length === 0, 'Customer detail exposes no sensitive fields');

  const crossRoleStatus = await request('PATCH', `/admin/customers/${providerUser._id}/status`, adminToken, { status: 'SUSPENDED' });
  check(crossRoleStatus.status === 404, 'Customer status operation cannot target a provider');

  const invalidStatus = await request('PATCH', `/admin/customers/${customer._id}/status`, adminToken, { status: 'DELETED' });
  check(invalidStatus.status === 400, 'Invalid account status is rejected');

  const selfStatus = await request('PATCH', `/admin/customers/${admin._id}/status`, adminToken, { status: 'SUSPENDED' });
  check(selfStatus.status === 404 || selfStatus.status === 403, 'Admin cannot self-suspend through customer endpoint');

  const suspendedCustomerStatus = await request('PATCH', `/admin/customers/${customerTwo._id}/status`, adminToken, { status: 'SUSPENDED' });
  check(suspendedCustomerStatus.status === 200, 'Admin can suspend a customer');
  const customerTwoToken = createAccessToken(customerTwo);
  const suspendedCustomerAuth = await request('GET', '/account', customerTwoToken);
  check(suspendedCustomerAuth.status === 401, 'Suspended customer is rejected by authentication');

  const providers = await request('GET', '/admin/providers?verificationStatus=PENDING&limit=10&page=1', adminToken);
  check(providers.status === 200, 'Admin can list providers');
  check(providers.payload.data.some((item) => item._id === pendingProvider._id.toString()), 'Verification filter returns pending provider');

  const providerDetail = await request('GET', `/admin/providers/${provider._id}`, adminToken);
  check(providerDetail.status === 200, 'Admin can retrieve provider detail');
  check(providerDetail.payload.data.services.length >= 1, 'Provider detail includes listed services');
  check(forbiddenKeys(providerDetail.payload.data).length === 0, 'Provider detail exposes no sensitive fields');

  const rejectWithoutReason = await request('PATCH', `/admin/providers/${pendingProvider._id}/verification`, adminToken, { verificationStatus: 'REJECTED' });
  check(rejectWithoutReason.status === 400, 'Verification rejection requires a reason');

  const reject = await request('PATCH', `/admin/providers/${pendingProvider._id}/verification`, adminToken, { verificationStatus: 'REJECTED', reason: 'Incomplete business information' });
  check(reject.status === 200, 'Admin can reject provider verification');
  const rejectedProvider = await ProviderProfile.findById(pendingProvider._id);
  check(rejectedProvider.verificationStatus === 'REJECTED', 'Rejected status is persisted');
  check(rejectedProvider.verificationReason === 'Incomplete business information', 'Rejection reason audit field is persisted');
  check(rejectedProvider.verificationReviewedBy?.toString() === admin._id.toString(), 'Reviewing administrator is persisted');
  check(rejectedProvider.verificationReviewedAt instanceof Date, 'Verification review timestamp is persisted');

  const approve = await request('PATCH', `/admin/providers/${pendingProvider._id}/verification`, adminToken, { verificationStatus: 'VERIFIED' });
  check(approve.status === 200, 'Admin can approve provider verification');
  const approvedProvider = await ProviderProfile.findById(pendingProvider._id);
  check(approvedProvider.verificationStatus === 'VERIFIED', 'Approved status is persisted');

  const suspendedProviderStatus = await request('PATCH', `/admin/providers/${provider._id}/status`, adminToken, { status: 'SUSPENDED' });
  check(suspendedProviderStatus.status === 200, 'Admin can suspend provider account');
  const suspendedProviderAuth = await request('GET', '/account', providerToken);
  check(suspendedProviderAuth.status === 401, 'Suspended provider is rejected by authentication');
  const suspendedPublicProvider = await request('GET', `/discovery/providers/${provider._id}`);
  check(suspendedPublicProvider.status === 404, 'Suspended provider is excluded from public discovery');
  await User.findByIdAndUpdate(providerUser._id, { $set: { status: 'ACTIVE' } });

  const invalidProviderVerification = await request('PATCH', `/admin/providers/${provider._id}/verification`, customerToken, { verificationStatus: 'VERIFIED' });
  check(invalidProviderVerification.status === 403, 'Customer cannot change verification');

  const services = await request('GET', `/admin/services?search=${encodeURIComponent(service.title)}&isActive=true&limit=10`, adminToken);
  check(services.status === 200, 'Admin can list services');
  check(services.payload.data.some((item) => item._id === service._id.toString()), 'Service search finds expected record');
  const deactivateService = await request('PATCH', `/admin/services/${service._id}/status`, adminToken, { isActive: false });
  check(deactivateService.status === 200, 'Admin can deactivate service');
  check((await Service.findById(service._id)).isActive === false, 'Service deactivation is persisted');
  const reactivateService = await request('PATCH', `/admin/services/${service._id}/status`, adminToken, { isActive: true });
  check(reactivateService.status === 200, 'Admin can reactivate service');

  const bookings = await request('GET', '/admin/bookings?status=PENDING&limit=10&page=1', adminToken);
  check(bookings.status === 200, 'Admin can list bookings');
  check(bookings.payload.data.some((item) => item._id === booking._id.toString()), 'Booking status filter works');
  const bookingDetail = await request('GET', `/admin/bookings/${booking._id}`, adminToken);
  check(bookingDetail.status === 200, 'Admin can retrieve booking detail');
  check(bookingDetail.payload.data.serviceSnapshot.price === 150, 'Booking price snapshot is preserved');
  const invalidBookingId = await request('GET', '/admin/bookings/not-an-id', adminToken);
  check(invalidBookingId.status === 400, 'Invalid booking ID is rejected');

  const categories = await request('GET', '/admin/categories?limit=10&page=1&includeServiceCount=true', adminToken);
  check(categories.status === 200, 'Admin can list categories');
  check(categories.payload.data.some((item) => item._id === category._id.toString()), 'Category listing includes active category');

  const createCategory = await request('POST', '/categories', adminToken, { name: `Phase16 New ${runId}`, description: 'New category' });
  check(createCategory.status === 201, 'Admin can create category');
  const createdCategory = await Category.findOne({ name: `phase16 new ${runId}` });
  const deactivateCategory = await request('PATCH', `/categories/${createdCategory._id}/status`, adminToken, { isActive: false });
  check(deactivateCategory.status === 200, 'Admin can deactivate category');
  check((await Category.findById(createdCategory._id)).isActive === false, 'Category deactivation is persisted');

  const adminReviews = await request('GET', '/admin/reviews?status=PUBLISHED&reported=true&limit=10&page=1', adminToken);
  check(adminReviews.status === 200, 'Admin can list reviews');
  check(adminReviews.payload.data.some((item) => item._id === review._id.toString()), 'Reported review filter works');

  const hideReview = await request('PATCH', `/admin/reviews/${review._id}/moderation`, adminToken, { status: 'HIDDEN', reason: 'Moderation test' });
  check(hideReview.status === 200, 'Admin can hide review');
  check((await Review.findById(review._id)).status === 'HIDDEN', 'Review hide status is persisted');
  const providerAfterHide = await ProviderProfile.findById(provider._id);
  check(providerAfterHide.averageRating === 0 && providerAfterHide.totalReviews === 0, 'Hidden review changes rating aggregates');
  const publicHidden = await request('GET', `/reviews/${review._id}`);
  check(publicHidden.status === 404, 'Hidden review is excluded from public access');

  const restoreReview = await request('PATCH', `/admin/reviews/${review._id}/moderation`, adminToken, { status: 'PUBLISHED', reason: 'Restore after moderation test' });
  check(restoreReview.status === 200, 'Admin can restore review');
  const providerAfterRestore = await ProviderProfile.findById(provider._id);
  check(providerAfterRestore.averageRating === 5 && providerAfterRestore.totalReviews === 1, 'Restored review recalculates rating aggregates');

  const reports = await request('GET', '/admin/reports?reason=SPAM&limit=10&page=1', adminToken);
  check(reports.status === 200, 'Admin can access review reports');
  check(reports.payload.data.length >= 1, 'Report list contains fixture report');
  check(reports.payload.data.every((item) => !Object.hasOwn(item, 'reporter')), 'Report identity is not exposed');
  check(forbiddenKeys(reports.payload.data).length === 0, 'Report response excludes sensitive fields');

  const badOperatorQuery = await request('GET', '/admin/customers?page=1&limit=10&sortBy[$ne]=createdAt', adminToken);
  check(badOperatorQuery.status === 400, 'MongoDB operator syntax cannot bypass query validation');
  const badPagination = await request('GET', '/admin/bookings?page=-1&limit=1000', adminToken);
  check(badPagination.status === 400, 'Invalid booking pagination is rejected');

  const publicProviderAfterSuspension = await request('GET', `/discovery/providers/${provider._id}`);
  check(publicProviderAfterSuspension.status === 200, 'Provider is restored to public discovery after reactivation');

  console.log(`Phase 16 backend security and integration checks passed (${testCount} assertions).`);
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
}
