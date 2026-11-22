import { Schema } from 'mongoose';

export const pricingTypes = ['FIXED', 'HOURLY', 'STARTING_FROM', 'QUOTE'];
export const addressLabels = ['Home', 'Work', 'Other'];
export const weekDays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates) {
          return (
            coordinates.length === 2
            && Number.isFinite(coordinates[0])
            && Number.isFinite(coordinates[1])
            && coordinates[0] >= -180
            && coordinates[0] <= 180
            && coordinates[1] >= -90
            && coordinates[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false },
);

const addressDefinition = {
  label: {
    type: String,
    enum: addressLabels,
    required: true,
  },
  fullAddress: { type: String, trim: true, required: true, maxlength: 500 },
  street: { type: String, trim: true, required: true, maxlength: 200 },
  city: { type: String, trim: true, required: true, maxlength: 100 },
  state: { type: String, trim: true, required: true, maxlength: 100 },
  postalCode: { type: String, trim: true, required: true, maxlength: 32 },
  country: { type: String, trim: true, required: true, maxlength: 100 },
  location: { type: geoPointSchema, default: undefined },
  isDefault: { type: Boolean, default: false },
};

export const createAddressSchema = (options = {}) =>
  new Schema(addressDefinition, options);

const serviceAreaDefinition = {
  city: { type: String, trim: true, required: true, maxlength: 100 },
  state: { type: String, trim: true, required: true, maxlength: 100 },
  country: { type: String, trim: true, required: true, maxlength: 100 },
  postalCodes: {
    type: [{ type: String, trim: true, maxlength: 32 }],
    default: [],
  },
  location: { type: geoPointSchema, default: undefined },
};

export const serviceAreaSchema = new Schema(serviceAreaDefinition, { _id: false });
export const providerServiceAreaSchema = new Schema(serviceAreaDefinition);

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const weeklyAvailabilitySchema = new Schema(
  {
    day: { type: String, enum: weekDays, required: true },
    isAvailable: { type: Boolean, default: true },
    startTime: { type: String, match: timePattern },
    endTime: { type: String, match: timePattern },
  },
  { _id: false },
);

weeklyAvailabilitySchema.pre('validate', function validateAvailabilityDay() {
  if (this.isAvailable && (!this.startTime || !this.endTime)) {
    this.invalidate('startTime', 'Available days require a start time and end time');
  }

  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be later than start time');
  }
});

export const serviceSnapshotSchema = new Schema(
  {
    title: { type: String, trim: true, required: true, maxlength: 160 },
    pricingType: { type: String, enum: pricingTypes, required: true },
    price: { type: Number, min: 0 },
  },
  { _id: false },
);

serviceSnapshotSchema.pre('validate', function validateSnapshotPricing() {
  if (
    this.pricingType === 'QUOTE'
    && this.price !== undefined
    && this.price !== null
  ) {
    this.invalidate('price', 'Quote pricing must not include a fixed price');
  }

  if (
    this.pricingType
    && this.pricingType !== 'QUOTE'
    && (this.price === undefined || this.price === null)
  ) {
    this.invalidate('price', 'Price is required for the selected pricing type');
  }
});

export function isValidHttpUrl(value) {
  return isHttpUrl(value);
}

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
