import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  Booking,
  Category,
  CustomerProfile,
  ProviderProfile,
  Review,
  Service,
  User,
} from '../src/models/index.js';

const testMongoUri = process.env.MODEL_TEST_MONGODB_URI;

if (!testMongoUri) {
  throw new Error(
    'Set MODEL_TEST_MONGODB_URI to a dedicated MongoDB test database ending in "_test".',
  );
}

const testDatabaseName = new URL(testMongoUri).pathname.replace(/^\/+/, '').split('/')[0];

if (!testDatabaseName.toLowerCase().endsWith('_test')) {
  throw new Error('Model validation only runs against a database whose name ends in "_test".');
}

const userIds = [];
const reviewIds = [];

async function expectValidationFailure(document, path) {
  await assert.rejects(document.validate(), (error) => {
    assert.ok(error instanceof mongoose.Error.ValidationError);
    assert.ok(!path || error.errors[path]);
    return true;
  });
}

async function validateModels() {
  const validUser = new User({
    firstName: '  Alex ',
    lastName: 'Taylor  ',
    email: '  Alex.Taylor@Example.com ',
    password: 'a-secure-test-password',
  });

  await validUser.validate();
  assert.equal(validUser.email, 'alex.taylor@example.com');
  assert.equal(validUser.toJSON().password, undefined);

  await expectValidationFailure(
    new User({
      firstName: 'Alex',
      lastName: 'Taylor',
      email: 'alex@example.com',
      password: 'a-secure-test-password',
      role: 'SUPERUSER',
    }),
    'role',
  );

  const address = {
    label: 'Home',
    fullAddress: '10 Main Street, Springfield',
    street: '10 Main Street',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'US',
    location: { type: 'Point', coordinates: [-118.4, 34.1] },
  };
  const customerProfile = new CustomerProfile({
    user: new mongoose.Types.ObjectId(),
    addresses: [address],
  });
  customerProfile.defaultAddressId = customerProfile.addresses[0]._id;

  await customerProfile.validate();
  await expectValidationFailure(
    new CustomerProfile({
      user: new mongoose.Types.ObjectId(),
      addresses: [{ ...address, location: { type: 'Point', coordinates: [181, 91] } }],
    }),
  );
  await expectValidationFailure(
    new CustomerProfile({
      user: new mongoose.Types.ObjectId(),
      addresses: [address],
      defaultAddressId: new mongoose.Types.ObjectId(),
    }),
    'defaultAddressId',
  );

  await expectValidationFailure(
    new ProviderProfile({
      user: new mongoose.Types.ObjectId(),
      businessName: 'Local Repairs',
      experienceYears: -1,
    }),
    'experienceYears',
  );

  const category = new Category({ name: '  Appliance Repair  ' });
  await category.validate();
  assert.equal(category.name, 'appliance repair');
  assert.equal(category.slug, 'appliance-repair');

  await expectValidationFailure(
    new Service({
      provider: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      title: 'Window Cleaning',
      description: 'Interior and exterior window cleaning.',
      pricingType: 'FIXED',
      serviceLocationType: 'AT_CUSTOMER_LOCATION',
    }),
    'price',
  );
  await expectValidationFailure(
    new Service({
      provider: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      title: 'Window Cleaning',
      description: 'Interior and exterior window cleaning.',
      pricingType: 'QUOTE',
      price: 25,
      serviceLocationType: 'AT_CUSTOMER_LOCATION',
    }),
    'price',
  );

  const service = new Service({
    provider: new mongoose.Types.ObjectId(),
    category: new mongoose.Types.ObjectId(),
    title: 'Window Cleaning',
    description: 'Interior and exterior window cleaning.',
    pricingType: 'HOURLY',
    price: 45,
    serviceLocationType: 'AT_CUSTOMER_LOCATION',
    availability: [
      { day: 'MONDAY', startTime: '09:00', endTime: '17:00' },
    ],
  });
  await service.validate();
  assert.equal(service.slug, 'window-cleaning');

  await expectValidationFailure(new Booking({}));

  const booking = new Booking({
    customer: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(),
    scheduledTime: '13:30',
    address,
    serviceSnapshot: {
      title: 'Window Cleaning',
      pricingType: 'HOURLY',
      price: 45,
    },
  });
  await booking.validate();
  assert.match(booking.bookingNumber, /^LL-[0-9A-F-]{36}$/);

  for (const rating of [0, 6]) {
    await expectValidationFailure(
      new Review({
        booking: new mongoose.Types.ObjectId(),
        customer: new mongoose.Types.ObjectId(),
        provider: new mongoose.Types.ObjectId(),
        service: new mongoose.Types.ObjectId(),
        rating,
      }),
      'rating',
    );
  }

  await mongoose.connect(testMongoUri);
  const models = [User, CustomerProfile, ProviderProfile, Category, Service, Booking, Review];
  await Promise.all(models.map((model) => model.init()));

  const email = `model-validation-${new mongoose.Types.ObjectId()}@example.test`;
  const savedUser = await new User({
    firstName: 'Index',
    lastName: 'Check',
    email,
    password: 'a-secure-test-password',
  }).save();
  userIds.push(savedUser._id);

  await assert.rejects(
    new User({
      firstName: 'Duplicate',
      lastName: 'Check',
      email,
      password: 'a-secure-test-password',
    }).save(),
    (error) => error.code === 11000,
  );

  const bookingId = new mongoose.Types.ObjectId();
  const review = await new Review({
    booking: bookingId,
    customer: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    rating: 5,
  }).save();
  reviewIds.push(review._id);

  await assert.rejects(
    new Review({
      booking: bookingId,
      customer: new mongoose.Types.ObjectId(),
      provider: new mongoose.Types.ObjectId(),
      service: new mongoose.Types.ObjectId(),
      rating: 4,
    }).save(),
    (error) => error.code === 11000,
  );
}

try {
  await validateModels();
  console.log('Model validation checks passed.');
} finally {
  if (mongoose.connection.readyState !== 0) {
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
    }

    if (reviewIds.length > 0) {
      await Review.deleteMany({ _id: { $in: reviewIds } });
    }

    await mongoose.disconnect();
  }
}
