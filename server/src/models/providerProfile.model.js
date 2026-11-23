import mongoose, { Schema } from 'mongoose';
import {
  isValidHttpUrl,
  providerServiceAreaSchema,
} from './schemas/common.schemas.js';

const providerProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 150,
    },
    description: { type: String, trim: true, maxlength: 4000 },
    profileImage: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value === undefined || isValidHttpUrl(value),
        message: 'Profile image must be an HTTP or HTTPS URL',
      },
    },
    experienceYears: { type: Number, min: 0, default: 0 },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
    serviceAreas: {
      type: [providerServiceAreaSchema],
      default: [],
    },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    totalReviews: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
    totalCompletedBookings: {
      type: Number,
      min: 0,
      validate: Number.isInteger,
      default: 0,
    },
    isAvailable: { type: Boolean, default: true },
    verificationReason: { type: String, trim: true, maxlength: 1000 },
    verificationReviewedAt: { type: Date },
    verificationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, optimisticConcurrency: true },
);

providerProfileSchema.index({ verificationStatus: 1, isAvailable: 1 });
providerProfileSchema.index({ 'serviceAreas.location': '2dsphere' });

const ProviderProfile =
  mongoose.models.ProviderProfile
  || mongoose.model('ProviderProfile', providerProfileSchema);

export default ProviderProfile;
