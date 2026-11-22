import mongoose, { Schema } from 'mongoose';

export const notificationTypes = [
  'BOOKING_CREATED',
  'BOOKING_ACCEPTED',
  'BOOKING_REJECTED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'REVIEW_RECEIVED',
  'REVIEW_HIDDEN',
  'REVIEW_RESTORED',
  'SYSTEM',
];

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', immutable: true },
    type: { type: String, enum: notificationTypes, required: true, immutable: true },
    title: { type: String, trim: true, required: true, maxlength: 160, immutable: true },
    message: { type: String, trim: true, required: true, maxlength: 1000, immutable: true },
    resourceType: { type: String, enum: ['BOOKING', 'REVIEW', 'SERVICE', 'SYSTEM'], immutable: true },
    resourceId: { type: Schema.Types.ObjectId, immutable: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    eventKey: { type: String, trim: true, maxlength: 256, immutable: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ eventKey: 1 }, { unique: true, sparse: true });

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
