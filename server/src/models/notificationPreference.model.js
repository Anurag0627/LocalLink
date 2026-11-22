import mongoose, { Schema } from 'mongoose';

const notificationPreferenceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    inAppEnabled: { type: Boolean, default: true },
    bookingNotifications: { type: Boolean, default: true },
    reviewNotifications: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const NotificationPreference =
  mongoose.models.NotificationPreference
  || mongoose.model('NotificationPreference', notificationPreferenceSchema);

export default NotificationPreference;
