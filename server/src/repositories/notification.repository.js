import Notification from '../models/notification.model.js';
import NotificationPreference from '../models/notificationPreference.model.js';

export function create(data) {
  return Notification.create(data);
}

export async function list({ recipientId, page, limit, unreadOnly, type }) {
  const filter = { recipient: recipientId };
  if (unreadOnly === 'true') filter.isRead = false;
  if (type) filter.type = type;
  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  return { items, total };
}

export function countUnread(recipientId) {
  return Notification.countDocuments({ recipient: recipientId, isRead: false });
}

export function findOwned(recipientId, notificationId) {
  return Notification.findOne({ _id: notificationId, recipient: recipientId });
}

export function markOwnedRead(recipientId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: 'after', runValidators: true },
  );
}

export function markAllRead(recipientId) {
  return Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
}

export function deleteOwned(recipientId, notificationId) {
  return Notification.findOneAndDelete({ _id: notificationId, recipient: recipientId });
}

export function findPreferences(userId) {
  return NotificationPreference.findOne({ user: userId });
}

export function updatePreferences(userId, update) {
  return NotificationPreference.findOneAndUpdate(
    { user: userId },
    { $set: update },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}
