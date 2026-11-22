import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const testMongoUri = process.env.MANAGEMENT_TEST_MONGODB_URI;

if (!testMongoUri) {
  throw new Error(
    'Set MANAGEMENT_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".',
  );
}

const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];

if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Management validation only runs against a database whose name ends in "_test".');
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
}, { default: RefreshSession }, { default: argon2 }] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/env.js'),
  import('../src/models/user.model.js'),
  import('../src/models/customerProfile.model.js'),
  import('../src/models/providerProfile.model.js'),
  import('../src/models/refreshSession.model.js'),
  import('argon2'),
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
    token,
    refreshToken,
    rawBody,
  } = options;
  const headers = { Origin: trustedOrigin };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (refreshToken !== undefined) {
    headers.Cookie = `${env.COOKIE_NAME}=${refreshToken}`;
  }
  if (body !== undefined || rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  return {
    response,
    payload: await response.json(),
    setCookieHeader: response.headers.get('set-cookie'),
    cookie: extractCookie(response.headers.get('set-cookie')),
  };
}

function customerRegistration(email) {
  return {
    firstName: 'Profile',
    lastName: 'Customer',
    email,
    password: 'a-valid-management-password-123',
    confirmPassword: 'a-valid-management-password-123',
    role: 'CUSTOMER',
  };
}

function providerRegistration(email) {
  return {
    ...customerRegistration(email),
    role: 'PROVIDER',
    businessName: 'Management Services',
    description: 'Provider profile for API validation',
    experienceYears: 3,
  };
}

async function register(body) {
  testEmails.push(body.email);
  const result = await request('/api/v1/auth/register', { method: 'POST', body });
  assert.equal(result.response.status, 201);
  return {
    user: result.payload.data.user,
    token: result.payload.data.accessToken,
    refreshToken: result.cookie,
  };
}

function addressInput(overrides = {}) {
  return {
    label: 'Home',
    fullAddress: '100 Example Road, Springfield',
    street: '100 Example Road',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'US',
    location: { type: 'Point', coordinates: [-118.4, 34.1] },
    ...overrides,
  };
}

async function validateManagement() {
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

  const customerEmail = `customer-${randomUUID()}@example.test`;
  const otherCustomerEmail = `other-customer-${randomUUID()}@example.test`;
  const providerEmail = `provider-${randomUUID()}@example.test`;
  const otherProviderEmail = `other-provider-${randomUUID()}@example.test`;
  const customer = await register(customerRegistration(customerEmail));
  const otherCustomer = await register(customerRegistration(otherCustomerEmail));
  const provider = await register(providerRegistration(providerEmail));
  const otherProvider = await register(providerRegistration(otherProviderEmail));

  const unauthenticatedCustomer = await request('/api/v1/customers/profile');
  assert.equal(unauthenticatedCustomer.response.status, 401);

  const customerProfile = await request('/api/v1/customers/profile', {
    token: customer.token,
  });
  assert.equal(customerProfile.response.status, 200);
  assert.equal(customerProfile.payload.data.user.role, 'CUSTOMER');
  assert.equal(customerProfile.payload.data.user.authVersion, undefined);
  assert.equal(customerProfile.payload.data.user.password, undefined);
  assert.equal(customerProfile.payload.data.profile.user, undefined);
  assert.equal(customerProfile.payload.data.profile.__v, undefined);
  assert.deepEqual(customerProfile.payload.data.profile.addresses, []);

  const providerDeniedCustomerRoute = await request('/api/v1/customers/profile', {
    token: provider.token,
  });
  assert.equal(providerDeniedCustomerRoute.response.status, 403);

  const customerProfileUpdate = await request('/api/v1/customers/profile', {
    method: 'PATCH',
    token: customer.token,
    body: {
      firstName: 'Updated',
      lastName: 'Customer',
      phone: '+1 (415) 555-0132',
      profileImage: 'https://images.example.test/customer.png',
    },
  });
  assert.equal(customerProfileUpdate.response.status, 200);
  assert.equal(customerProfileUpdate.payload.data.user.firstName, 'Updated');
  assert.equal(
    customerProfileUpdate.payload.data.profile.profileImage,
    'https://images.example.test/customer.png',
  );

  const protectedCustomerFields = await request('/api/v1/customers/profile', {
    method: 'PATCH',
    token: customer.token,
    body: { role: 'ADMIN' },
  });
  assert.equal(protectedCustomerFields.response.status, 400);

  const invalidCustomerPhone = await request('/api/v1/account', {
    method: 'PATCH',
    token: customer.token,
    body: { phone: 'not-a-phone' },
  });
  assert.equal(invalidCustomerPhone.response.status, 400);

  const firstAddressResult = await request('/api/v1/customers/addresses', {
    method: 'POST',
    token: customer.token,
    body: addressInput(),
  });
  assert.equal(firstAddressResult.response.status, 201);
  const firstAddressId = firstAddressResult.payload.data.address._id;
  assert.equal(firstAddressResult.payload.data.address.isDefault, true);
  assert.equal(firstAddressResult.payload.data.defaultAddressId, firstAddressId);

  const invalidLocation = await request('/api/v1/customers/addresses', {
    method: 'POST',
    token: customer.token,
    body: addressInput({
      location: { type: 'Point', coordinates: [181, 91] },
    }),
  });
  assert.equal(invalidLocation.response.status, 400);

  const secondAddressResult = await request('/api/v1/customers/addresses', {
    method: 'POST',
    token: customer.token,
    body: addressInput({
      label: 'Work',
      city: 'Oakland',
      isDefault: true,
    }),
  });
  assert.equal(secondAddressResult.response.status, 201);
  const secondAddressId = secondAddressResult.payload.data.address._id;
  assert.equal(secondAddressResult.payload.data.defaultAddressId, secondAddressId);

  const secondAddressDefault = await request('/api/v1/customers/addresses', {
    token: customer.token,
  });
  assert.equal(secondAddressDefault.response.status, 200);
  assert.equal(
    secondAddressDefault.payload.data.addresses.filter((address) => address.isDefault).length,
    1,
  );
  assert.equal(
    secondAddressDefault.payload.data.addresses.find((address) => address._id === firstAddressId)
      .isDefault,
    false,
  );

  const updatedAddress = await request(`/api/v1/customers/addresses/${firstAddressId}`, {
    method: 'PATCH',
    token: customer.token,
    body: { city: 'Berkeley', location: null },
  });
  assert.equal(updatedAddress.response.status, 200);
  assert.equal(updatedAddress.payload.data.address.city, 'Berkeley');
  assert.equal(updatedAddress.payload.data.address.location, undefined);

  const invalidAddressId = await request('/api/v1/customers/addresses/not-an-id', {
    method: 'DELETE',
    token: customer.token,
  });
  assert.equal(invalidAddressId.response.status, 400);

  const crossCustomerAddressUpdate = await request(
    `/api/v1/customers/addresses/${firstAddressId}`,
    {
      method: 'PATCH',
      token: otherCustomer.token,
      body: { city: 'Unauthorized' },
    },
  );
  assert.equal(crossCustomerAddressUpdate.response.status, 404);

  const defaultUpdates = await Promise.all([
    request(`/api/v1/customers/addresses/${firstAddressId}/default`, {
      method: 'PATCH',
      token: customer.token,
    }),
    request(`/api/v1/customers/addresses/${secondAddressId}/default`, {
      method: 'PATCH',
      token: customer.token,
    }),
  ]);
  assert.deepEqual(defaultUpdates.map(({ response }) => response.status), [200, 200]);
  const customerProfileDocument = await CustomerProfile.findOne({ user: customer.user._id });
  const currentDefaultAddresses = customerProfileDocument.addresses
    .filter((address) => address.isDefault);
  assert.equal(currentDefaultAddresses.length, 1);
  assert.equal(
    currentDefaultAddresses[0]._id.toString(),
    customerProfileDocument.defaultAddressId.toString(),
  );

  const deleteDefaultAddress = await request(
    `/api/v1/customers/addresses/${customerProfileDocument.defaultAddressId}`,
    { method: 'DELETE', token: customer.token },
  );
  assert.equal(deleteDefaultAddress.response.status, 200);
  assert.equal(deleteDefaultAddress.payload.data.addresses.length, 1);
  assert.equal(deleteDefaultAddress.payload.data.addresses[0].isDefault, true);
  assert.equal(
    deleteDefaultAddress.payload.data.defaultAddressId,
    deleteDefaultAddress.payload.data.addresses[0]._id,
  );

  const unauthenticatedProvider = await request('/api/v1/providers/profile');
  assert.equal(unauthenticatedProvider.response.status, 401);

  const customerDeniedProviderRoute = await request('/api/v1/providers/profile', {
    token: customer.token,
  });
  assert.equal(customerDeniedProviderRoute.response.status, 403);

  const providerProfile = await request('/api/v1/providers/profile', {
    token: provider.token,
  });
  assert.equal(providerProfile.response.status, 200);
  assert.equal(providerProfile.payload.data.profile.verificationStatus, 'PENDING');
  assert.equal(providerProfile.payload.data.profile.user, undefined);
  assert.equal(providerProfile.payload.data.profile.__v, undefined);

  const providerProfileUpdate = await request('/api/v1/providers/profile', {
    method: 'PATCH',
    token: provider.token,
    body: {
      businessName: 'Updated Local Services',
      description: 'Updated profile text',
      experienceYears: 8,
      profileImage: 'https://images.example.test/provider.png',
    },
  });
  assert.equal(providerProfileUpdate.response.status, 200);
  assert.equal(
    providerProfileUpdate.payload.data.profile.businessName,
    'Updated Local Services',
  );

  for (const protectedField of ['verificationStatus', 'averageRating', 'totalReviews']) {
    const protectedProviderUpdate = await request('/api/v1/providers/profile', {
      method: 'PATCH',
      token: provider.token,
      body: { [protectedField]: protectedField === 'verificationStatus' ? 'VERIFIED' : 10 },
    });
    assert.equal(protectedProviderUpdate.response.status, 400);
  }

  const invalidExperience = await request('/api/v1/providers/profile', {
    method: 'PATCH',
    token: provider.token,
    body: { experienceYears: -1 },
  });
  assert.equal(invalidExperience.response.status, 400);

  const serviceAreaResult = await request('/api/v1/providers/service-areas', {
    method: 'POST',
    token: provider.token,
    body: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      postalCodes: ['94103', '94107'],
      location: { type: 'Point', coordinates: [-122.42, 37.77] },
    },
  });
  assert.equal(serviceAreaResult.response.status, 201);
  const serviceAreaId = serviceAreaResult.payload.data.serviceArea._id;
  assert.ok(serviceAreaId);

  const invalidServiceAreaLocation = await request('/api/v1/providers/service-areas', {
    method: 'POST',
    token: provider.token,
    body: {
      city: 'San Jose',
      state: 'CA',
      country: 'US',
      location: { type: 'Point', coordinates: [-121.9, 91] },
    },
  });
  assert.equal(invalidServiceAreaLocation.response.status, 400);

  const duplicateServiceArea = await request('/api/v1/providers/service-areas', {
    method: 'POST',
    token: provider.token,
    body: {
      city: 'san francisco',
      state: 'ca',
      country: 'us',
      postalCodes: ['94107', '94103'],
    },
  });
  assert.equal(duplicateServiceArea.response.status, 409);

  const duplicatePostalCodes = await request('/api/v1/providers/service-areas', {
    method: 'POST',
    token: provider.token,
    body: {
      city: 'San Jose',
      state: 'CA',
      country: 'US',
      postalCodes: ['95112', '95112'],
    },
  });
  assert.equal(duplicatePostalCodes.response.status, 400);

  const crossProviderServiceArea = await request(
    `/api/v1/providers/service-areas/${serviceAreaId}`,
    {
      method: 'PATCH',
      token: otherProvider.token,
      body: { city: 'Unauthorized' },
    },
  );
  assert.equal(crossProviderServiceArea.response.status, 404);

  const serviceAreaUpdate = await request(
    `/api/v1/providers/service-areas/${serviceAreaId}`,
    {
      method: 'PATCH',
      token: provider.token,
      body: { city: 'San Mateo', postalCodes: ['94401'] },
    },
  );
  assert.equal(serviceAreaUpdate.response.status, 200);
  assert.equal(serviceAreaUpdate.payload.data.serviceArea.city, 'San Mateo');
  assert.deepEqual(serviceAreaUpdate.payload.data.serviceArea.postalCodes, ['94401']);

  const providerAvailability = await request('/api/v1/providers/availability', {
    method: 'PATCH',
    token: provider.token,
    body: { isAvailable: false },
  });
  assert.equal(providerAvailability.response.status, 200);
  assert.equal(providerAvailability.payload.data.profile.isAvailable, false);
  assert.equal(providerAvailability.payload.data.profile.user, undefined);
  assert.equal(providerAvailability.payload.data.profile.__v, undefined);

  const invalidAvailability = await request('/api/v1/providers/availability', {
    method: 'PATCH',
    token: provider.token,
    body: { isAvailable: 'true' },
  });
  assert.equal(invalidAvailability.response.status, 400);

  const serviceAreaDelete = await request(
    `/api/v1/providers/service-areas/${serviceAreaId}`,
    { method: 'DELETE', token: provider.token },
  );
  assert.equal(serviceAreaDelete.response.status, 200);
  assert.deepEqual(serviceAreaDelete.payload.data.serviceAreas, []);

  const account = await request('/api/v1/account', { token: customer.token });
  assert.equal(account.response.status, 200);
  assert.deepEqual(Object.keys(account.payload.data).sort(), [
    'createdAt',
    'email',
    'firstName',
    'isEmailVerified',
    'lastLoginAt',
    'lastName',
    'phone',
    'role',
    'status',
  ]);
  assert.equal(account.payload.data.phone, '+1 (415) 555-0132');

  const accountUpdate = await request('/api/v1/account', {
    method: 'PATCH',
    token: customer.token,
    body: { firstName: 'Account', lastName: 'Updated', phone: null },
  });
  assert.equal(accountUpdate.response.status, 200);
  assert.equal(accountUpdate.payload.data.firstName, 'Account');
  assert.equal(accountUpdate.payload.data.phone, null);

  for (const protectedField of ['role', 'status', 'email']) {
    const protectedAccountUpdate = await request('/api/v1/account', {
      method: 'PATCH',
      token: customer.token,
      body: {
        firstName: 'Should Not Persist',
        [protectedField]: protectedField === 'role'
          ? 'ADMIN'
          : protectedField === 'status'
            ? 'SUSPENDED'
            : 'attacker@example.test',
      },
    });
    assert.equal(protectedAccountUpdate.response.status, 400);
  }

  const oldPassword = 'a-valid-management-password-123';
  const newPassword = 'a-new-management-password-456';
  const customerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: oldPassword },
  });
  assert.equal(customerLogin.response.status, 200);

  const wrongCurrentPassword = await request('/api/v1/account/change-password', {
    method: 'PATCH',
    token: customerLogin.payload.data.accessToken,
    body: {
      currentPassword: 'incorrect-current-password',
      newPassword,
      confirmPassword: newPassword,
    },
  });
  assert.equal(wrongCurrentPassword.response.status, 400);

  const weakNewPassword = await request('/api/v1/account/change-password', {
    method: 'PATCH',
    token: customerLogin.payload.data.accessToken,
    body: {
      currentPassword: oldPassword,
      newPassword: 'short',
      confirmPassword: 'short',
    },
  });
  assert.equal(weakNewPassword.response.status, 400);

  const samePassword = await request('/api/v1/account/change-password', {
    method: 'PATCH',
    token: customerLogin.payload.data.accessToken,
    body: {
      currentPassword: oldPassword,
      newPassword: oldPassword,
      confirmPassword: oldPassword,
    },
  });
  assert.equal(samePassword.response.status, 400);

  const changePassword = await request('/api/v1/account/change-password', {
    method: 'PATCH',
    token: customerLogin.payload.data.accessToken,
    refreshToken: customerLogin.cookie,
    body: {
      currentPassword: oldPassword,
      newPassword,
      confirmPassword: newPassword,
    },
  });
  assert.equal(changePassword.response.status, 200);
  assert.match(changePassword.setCookieHeader, /Expires=Thu, 01 Jan 1970/i);

  const savedCustomer = await User.findById(customer.user._id).select('+password +authVersion');
  assert.equal(savedCustomer.authVersion, 1);
  assert.equal(await argon2.verify(savedCustomer.password, newPassword), true);
  assert.equal(await argon2.verify(savedCustomer.password, oldPassword), false);
  assert.equal(savedCustomer.toJSON().authVersion, undefined);
  assert.equal(savedCustomer.toJSON().password, undefined);
  assert.equal(
    await RefreshSession.countDocuments({
      user: customer.user._id,
      revokedAt: null,
    }),
    0,
  );

  const oldAccessToken = await request('/api/v1/account', {
    token: customerLogin.payload.data.accessToken,
  });
  assert.equal(oldAccessToken.response.status, 401);

  const oldRefreshToken = await request('/api/v1/auth/refresh', {
    method: 'POST',
    refreshToken: customerLogin.cookie,
  });
  assert.equal(oldRefreshToken.response.status, 401);

  const oldPasswordLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: oldPassword },
  });
  assert.equal(oldPasswordLogin.response.status, 401);

  const newPasswordLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: newPassword },
  });
  assert.equal(newPasswordLogin.response.status, 200);

  const newAccessToken = await request('/api/v1/account', {
    token: newPasswordLogin.payload.data.accessToken,
  });
  assert.equal(newAccessToken.response.status, 200);
}

try {
  await validateManagement();
  console.log('User and profile management validation checks passed.');
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
