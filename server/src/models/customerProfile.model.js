import mongoose, { Schema } from 'mongoose';
import { createAddressSchema, isValidHttpUrl } from './schemas/common.schemas.js';

const customerProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    addresses: {
      type: [createAddressSchema()],
      default: [],
    },
    defaultAddressId: { type: Schema.Types.ObjectId },
    profileImage: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value === undefined || isValidHttpUrl(value),
        message: 'Profile image must be an HTTP or HTTPS URL',
      },
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

customerProfileSchema.pre('validate', function validateDefaultAddress() {
  if (
    this.defaultAddressId
    && !this.addresses.some((address) => address._id.equals(this.defaultAddressId))
  ) {
    this.invalidate('defaultAddressId', 'Default address must belong to this profile');
  }
});

customerProfileSchema.index({ 'addresses.location': '2dsphere' });

const CustomerProfile =
  mongoose.models.CustomerProfile
  || mongoose.model('CustomerProfile', customerProfileSchema);

export default CustomerProfile;
