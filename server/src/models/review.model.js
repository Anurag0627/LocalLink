import mongoose, { Schema } from 'mongoose';
import { isValidHttpUrl } from './schemas/common.schemas.js';

const reviewSchema = new Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
    images: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator: isValidHttpUrl,
            message: 'Review images must be HTTP or HTTPS URLs',
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['PUBLISHED', 'HIDDEN'],
      default: 'PUBLISHED',
      required: true,
    },
    reportCount: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
    moderationReason: { type: String, trim: true, maxlength: 1000 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ service: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, reportCount: -1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
