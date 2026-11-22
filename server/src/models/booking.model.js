import { randomUUID } from 'node:crypto';
import mongoose, { Schema } from 'mongoose';
import {
  createAddressSchema,
  serviceSnapshotSchema,
} from './schemas/common.schemas.js';

const bookingSchema = new Schema(
  {
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
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => `LL-${randomUUID().toUpperCase()}`,
    },
    schedulingKey: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: {
      type: String,
      required: true,
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    },
    duration: { type: Number, min: 1, validate: Number.isInteger },
    address: { type: createAddressSchema({ _id: false }), default: undefined },
    locationSnapshot: {
      type: new Schema(
        {
          city: { type: String, trim: true, maxlength: 100 },
          state: { type: String, trim: true, maxlength: 100 },
          country: { type: String, trim: true, maxlength: 100 },
          postalCodes: [{ type: String, trim: true, maxlength: 32 }],
          location: {
            type: {
              type: String,
              enum: ['Point'],
            },
            coordinates: [{ type: Number }],
          },
        },
        { _id: false },
      ),
      default: undefined,
    },
    serviceSnapshot: { type: serviceSnapshotSchema, required: true },
    customerNote: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
      required: true,
    },
    cancellationReason: { type: String, trim: true, maxlength: 1000 },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['CUSTOMER', 'PROVIDER'] },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

bookingSchema.index({ customer: 1, scheduledDate: -1 });
bookingSchema.index({ provider: 1, scheduledDate: 1 });
bookingSchema.index({ service: 1, scheduledDate: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ customer: 1, status: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, status: 1, scheduledDate: 1, scheduledTime: 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;
