import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: true,
      minlength: 1,
      maxlength: 80,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
      minlength: 1,
      maxlength: 80,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      unique: true,
    },
    phone: { type: String, trim: true, maxlength: 32 },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
      select: false,
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
      default: 'CUSTOMER',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      required: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    authVersion: {
      type: Number,
      min: 0,
      validate: Number.isInteger,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject) {
        delete returnedObject.password;
        delete returnedObject.authVersion;
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  },
);

userSchema.index({ role: 1, status: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
