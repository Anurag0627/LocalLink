import mongoose, { Schema } from 'mongoose';
import {
  isValidHttpUrl,
  pricingTypes,
  serviceAreaSchema,
  slugPattern,
  slugify,
  weeklyAvailabilitySchema,
} from './schemas/common.schemas.js';

const serviceSchema = new Schema(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    title: { type: String, trim: true, required: true, minlength: 3, maxlength: 160 },
    slug: { type: String, trim: true, lowercase: true, match: slugPattern },
    description: { type: String, trim: true, required: true, maxlength: 5000 },
    images: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator: isValidHttpUrl,
            message: 'Service images must be HTTP or HTTPS URLs',
          },
        },
      ],
      default: [],
    },
    pricingType: { type: String, enum: pricingTypes, required: true },
    price: { type: Number, min: 0 },
    estimatedDuration: { type: Number, min: 1, validate: Number.isInteger },
    serviceLocationType: {
      type: String,
      enum: ['AT_CUSTOMER_LOCATION', 'AT_PROVIDER_LOCATION', 'REMOTE'],
      required: true,
    },
    serviceAreas: {
      type: [serviceAreaSchema],
      default: [],
    },
    availability: {
      type: [weeklyAvailabilitySchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    totalReviews: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
    totalBookings: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
  },
  { timestamps: true },
);

serviceSchema.pre('validate', function validateService() {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }

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

  const days = this.availability.map(({ day }) => day);
  if (new Set(days).size !== days.length) {
    this.invalidate('availability', 'Availability can include each weekday only once');
  }
});

serviceSchema.index({ provider: 1, slug: 1 }, { unique: true });
serviceSchema.index({ provider: 1, isActive: 1, createdAt: -1 });
serviceSchema.index({ category: 1, isActive: 1, averageRating: -1 });
serviceSchema.index({ isActive: 1, averageRating: -1 });
serviceSchema.index({ isActive: 1, createdAt: -1 });
serviceSchema.index({ isActive: 1, category: 1, createdAt: -1 });
serviceSchema.index(
  { isActive: 1, title: 'text', description: 'text' },
  { weights: { title: 10, description: 2 }, name: 'active_service_text_search' },
);
serviceSchema.index({ 'serviceAreas.location': '2dsphere' });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

export default Service;
