import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import mongoose from 'mongoose';

const testMongoUri = process.env.AUTH_TEST_MONGODB_URI;

if (!testMongoUri) {
  throw new Error(
    'Set AUTH_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".',
  );
}

const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];

if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Authentication validation only runs against a database whose name ends in "_test".');
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = testMongoUri;
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET = randomBytes(64).toString('base64url');
process.env.COOKIE_NAME = 'locallink_refresh_token';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';

const [{ default: app }, { env }, { default: User }, { default: CustomerProfile }, {
  default: ProviderProfile,
}, { default: RefreshSession }, { default: argon2 }, { default: authorizeRoles }, {
  hashRefreshToken,
}] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/env.js'),
  import('../src/models/user.model.js'),
  import('../src/models/customerProfile.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/refreshSession.model.js'),
  import('argon2'),
  import('../src/middlewares/role.middleware.js'),
  import('../src/services/token.service.js'),
]);

const trustedOrigin = env.CLIENT_URL[0];
const testEmails = [];
let server;
let connected = false;

function extractCookie(setCookieHeader) {
  const prefix = `${env.COOKIE_NAME}=`;
  if (!setCookieHeader?.startsWith(prefix)) {
    return undefined;
  }
  return setCookieHeader.slice(prefix.length).split(';', 1)[0];
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    rawBody,
    accessToken,
    refreshToken,
    origin = trustedOrigin,
    omitOrigin = false,
  } = options;
  const headers = {};

  if (!omitOrigin) {
    headers.Origin = origin;
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (refreshToken !== undefined) {
    headers.Cookie = `${env.COOKIE_NAME}=${refreshToken}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const payload = await response.json();
  const setCookieHeader = response.headers.get('set-cookie');

  return {
    response,
    payload,
    setCookieHeader,
    cookie: extractCookie(setCookieHeader),
  };
}

function customerRegistration(email) {
  return {
    firstName: 'Test',
    lastName: 'Customer',
    email,
    password: 'a-valid-test-password-123',
    confirmPassword: 'a-valid-test-password-123',
    role: 'CUSTOMER',
  };
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function validateAuth() {
  await mongoose.connect(testMongoUri);
  connected = true;
  await Promise.all([
    User.init(),
    CustomerProfile.init(),
    ProviderProfile.init(),
    RefreshSession.init(),
  ]);

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const health = await request('/api/v1/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.response.headers.get('access-control-allow-origin'), trustedOrigin);
  assert.equal(health.response.headers.get('access-control-allow-credentials'), 'true');

  const disallowedOrigin = await request('/api/v1/health', {
    origin: 'https://untrusted.example',
  });
  assert.equal(disallowedOrigin.response.status, 403);
  assert.equal(disallowedOrigin.payload.success, false);

  const noOrigin = await request('/api/v1/auth/register', {
    method: 'POST',
    body: customerRegistration('missing-origin@example.test'),
    omitOrigin: true,
  });
  assert.equal(noOrigin.response.status, 403);

  const malformedJson = await request('/api/v1/auth/login', {
    method: 'POST',
    rawBody: '{"email":',
  });
  assert.equal(malformedJson.response.status, 400);
  assert.equal(malformedJson.payload.message, 'Malformed JSON request');

  const customerEmail = `customer-${randomUUID()}@example.test`;
  testEmails.push(customerEmail);
  const customerRegistrationResult = await request('/api/v1/auth/register', {
    method: 'POST',
    body: customerRegistration(customerEmail),
  });
  assert.equal(customerRegistrationResult.response.status, 201);
  assert.equal(customerRegistrationResult.payload.success, true);
  assert.equal(customerRegistrationResult.payload.data.user.password, undefined);
  assert.ok(customerRegistrationResult.cookie);
  assert.match(customerRegistrationResult.setCookieHeader, /HttpOnly/i);
  assert.match(customerRegistrationResult.setCookieHeader, /Path=\/api\/v1\/auth/i);
  assert.match(customerRegistrationResult.setCookieHeader, /SameSite=Lax/i);

  const customerId = customerRegistrationResult.payload.data.user._id;
  const customer = await User.findById(customerId).select('+password');
  assert.match(customer.password, /^\$argon2id\$/);
  assert.equal(await argon2.verify(customer.password, 'a-valid-test-password-123'), true);

  const customerProfile = await CustomerProfile.findOne({ user: customerId });
  assert.ok(customerProfile);

  const meWithoutToken = await request('/api/v1/auth/me');
  assert.equal(meWithoutToken.response.status, 401);

  const customerMe = await request('/api/v1/auth/me', {
    accessToken: customerRegistrationResult.payload.data.accessToken,
  });
  assert.equal(customerMe.response.status, 200);
  assert.equal(customerMe.payload.data.user.password, undefined);
  assert.equal(customerMe.payload.data.profile.user.toString(), customerId);

  const providerEmail = `provider-${randomUUID()}@example.test`;
  testEmails.push(providerEmail);
  const providerRegistrationResult = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      ...customerRegistration(providerEmail),
      role: 'PROVIDER',
      businessName: 'Test Services',
      description: 'Test provider profile',
      experienceYears: 4,
    },
  });
  assert.equal(providerRegistrationResult.response.status, 201);
  const providerId = providerRegistrationResult.payload.data.user._id;
  const providerProfile = await ProviderProfile.findOne({ user: providerId });
  assert.equal(providerProfile.businessName, 'Test Services');
  assert.equal(providerProfile.verificationStatus, 'PENDING');

  await User.updateOne({ _id: providerId }, { $set: { status: 'SUSPENDED' } });
  const suspendedLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: providerEmail, password: 'a-valid-test-password-123' },
  });
  assert.equal(suspendedLogin.response.status, 403);

  const roleErrors = [];
  authorizeRoles('PROVIDER')(
    { user: customerRegistrationResult.payload.data.user },
    {},
    (error) => roleErrors.push(error),
  );
  assert.equal(roleErrors[0].statusCode, 403);

  const duplicateRegistration = await request('/api/v1/auth/register', {
    method: 'POST',
    body: customerRegistration(customerEmail),
  });
  assert.equal(duplicateRegistration.response.status, 409);

  const invalidLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'incorrect-password' },
  });
  assert.equal(invalidLogin.response.status, 401);
  assert.equal(invalidLogin.payload.message, 'Invalid email or password');

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'a-valid-test-password-123' },
  });
  assert.equal(login.response.status, 200);
  assert.ok(login.cookie);
  assert.equal(login.payload.data.user.password, undefined);

  const originalRefreshToken = customerRegistrationResult.cookie;
  const refresh = await request('/api/v1/auth/refresh', {
    method: 'POST',
    refreshToken: originalRefreshToken,
  });
  assert.equal(refresh.response.status, 200);
  assert.ok(refresh.cookie);
  assert.notEqual(refresh.cookie, originalRefreshToken);

  const originalSession = await RefreshSession.findOne({
    tokenHash: tokenHash(originalRefreshToken),
  }).select('+tokenHash');
  const replacementSession = await RefreshSession.findOne({
    tokenHash: tokenHash(refresh.cookie),
  }).select('+tokenHash');
  assert.ok(originalSession.revokedAt);
  assert.ok(replacementSession);
  assert.equal(replacementSession.tokenHash, hashRefreshToken(refresh.cookie));
  assert.notEqual(replacementSession.tokenHash, refresh.cookie);

  const replay = await request('/api/v1/auth/refresh', {
    method: 'POST',
    refreshToken: originalRefreshToken,
  });
  assert.equal(replay.response.status, 401);
  assert.match(replay.setCookieHeader, /Expires=Thu, 01 Jan 1970/i);

  const familyReuseCheck = await request('/api/v1/auth/refresh', {
    method: 'POST',
    refreshToken: refresh.cookie,
  });
  assert.equal(familyReuseCheck.response.status, 401);
  const revokedReplacement = await RefreshSession.findById(replacementSession._id);
  assert.ok(revokedReplacement.revokedAt);

  const concurrentLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'a-valid-test-password-123' },
  });
  const concurrentRefreshes = await Promise.all([
    request('/api/v1/auth/refresh', {
      method: 'POST',
      refreshToken: concurrentLogin.cookie,
    }),
    request('/api/v1/auth/refresh', {
      method: 'POST',
      refreshToken: concurrentLogin.cookie,
    }),
  ]);
  assert.deepEqual(
    concurrentRefreshes.map(({ response }) => response.status).sort(),
    [200, 401],
  );
  const concurrentWinner = concurrentRefreshes.find(({ response }) => response.status === 200);
  const concurrentReuseCheck = await request('/api/v1/auth/refresh', {
    method: 'POST',
    refreshToken: concurrentWinner.cookie,
  });
  assert.equal(concurrentReuseCheck.response.status, 401);

  const logoutLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'a-valid-test-password-123' },
  });
  const logout = await request('/api/v1/auth/logout', {
    method: 'POST',
    refreshToken: logoutLogin.cookie,
  });
  assert.equal(logout.response.status, 200);
  assert.match(logout.setCookieHeader, /Expires=Thu, 01 Jan 1970/i);
  const loggedOutSession = await RefreshSession.findOne({
    tokenHash: tokenHash(logoutLogin.cookie),
  });
  assert.ok(loggedOutSession.revokedAt);

  const firstDevice = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'a-valid-test-password-123' },
  });
  const secondDevice = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'a-valid-test-password-123' },
  });
  const logoutAll = await request('/api/v1/auth/logout-all', {
    method: 'POST',
    accessToken: firstDevice.payload.data.accessToken,
    refreshToken: firstDevice.cookie,
  });
  assert.equal(logoutAll.response.status, 200);

  for (const token of [firstDevice.cookie, secondDevice.cookie]) {
    const revokedSession = await RefreshSession.findOne({ tokenHash: tokenHash(token) });
    assert.ok(revokedSession.revokedAt);
    const refreshRevokedSession = await request('/api/v1/auth/refresh', {
      method: 'POST',
      refreshToken: token,
    });
    assert.equal(refreshRevokedSession.response.status, 401);
  }

  const mismatchedPassword = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      ...customerRegistration(`mismatch-${randomUUID()}@example.test`),
      confirmPassword: 'different-password',
    },
  });
  assert.equal(mismatchedPassword.response.status, 400);

  const invalidRegistration = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {},
  });
  assert.equal(invalidRegistration.response.status, 400);

  const rateLimited = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {},
  });
  assert.equal(rateLimited.response.status, 429);
  assert.match(rateLimited.payload.message, /Too many authentication attempts/);
}

try {
  await validateAuth();
  console.log('Authentication validation checks passed.');
} finally {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (connected) {
    const users = await User.find({ email: { $in: testEmails } }).select('_id').lean();
    const userIds = users.map((user) => user._id);
    if (userIds.length > 0) {
      await Promise.all([
        CustomerProfile.deleteMany({ user: { $in: userIds } }),
        ProviderProfile.deleteMany({ user: { $in: userIds } }),
        RefreshSession.deleteMany({ user: { $in: userIds } }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
    }

    await mongoose.disconnect();
  }
}
