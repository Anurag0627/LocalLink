import mongoose, { Schema } from 'mongoose';

const refreshSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    familyId: { type: String, required: true },
    authVersion: {
      type: Number,
      min: 0,
      validate: Number.isInteger,
      default: 0,
      select: false,
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String, select: false },
    lastUsedAt: { type: Date },
    userAgent: { type: String, trim: true, maxlength: 512 },
    ipAddress: { type: String, trim: true, maxlength: 128 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject) {
        delete returnedObject.tokenHash;
        delete returnedObject.replacedByTokenHash;
        delete returnedObject.authVersion;
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  },
);

refreshSessionSchema.index({ user: 1, revokedAt: 1 });
refreshSessionSchema.index({ familyId: 1, revokedAt: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshSession =
  mongoose.models.RefreshSession
  || mongoose.model('RefreshSession', refreshSessionSchema);

export default RefreshSession;
