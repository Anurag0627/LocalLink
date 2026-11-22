import logger from '../config/logger.js';
import * as notificationRepository from '../repositories/notification.repository.js';
import ApiError from '../utils/ApiError.js';

const defaults = {
  inAppEnabled: true,
  bookingNotifications: true,
  reviewNotifications: true,
  systemNotifications: true,
};

function categoryEnabled(preferences, type) {
  if (!preferences.inAppEnabled) return false;
  if (type.startsWith('BOOKING_')) return preferences.bookingNotifications;
  if (type.startsWith('REVIEW_')) return preferences.reviewNotifications;
  if (type === 'SYSTEM') return preferences.systemNotifications;
  return true;
}

export async function createNotification({
  recipient,
  actor,
  type,
  title,
  message,
  resourceType,
  resourceId,
  metadata = {},
  eventKey,
}) {
  if (!recipient) return null;

  try {
    const preference = await notificationRepository.findPreferences(recipient);
    const preferences = preference ? preference.toObject() : defaults;
    if (!categoryEnabled(preferences, type)) return null;

    return await notificationRepository.create({
      recipient,
      ...(actor ? { actor } : {}),
      type,
      title,
      message,
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
      metadata,
      ...(eventKey ? { eventKey } : {}),
    });
  } catch (error) {
    if (error?.code !== 11000) {
      logger.error(
        { errorName: error.name, notificationType: type, eventKey },
        'Best-effort notification creation failed',
      );
    }
    return null;
  }
}

export async function listNotifications(userId, query) {
  const result = await notificationRepository.list({
    recipientId: userId,
    ...query,
  });
  return {
    items: result.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export function getUnreadCount(userId) {
  return notificationRepository.countUnread(userId);
}

export async function getNotification(userId, notificationId) {
  const notification = await notificationRepository.findOwned(userId, notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  return notification;
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await notificationRepository.markOwnedRead(userId, notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  return notification;
}

export async function markAllNotificationsRead(userId) {
  return notificationRepository.markAllRead(userId);
}

export async function deleteNotification(userId, notificationId) {
  const notification = await notificationRepository.deleteOwned(userId, notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  return notification;
}

export async function getPreferences(userId) {
  const preference = await notificationRepository.findPreferences(userId);
  if (!preference) return { user: userId, ...defaults };
  return preference.toObject();
}

export async function updatePreferences(userId, data) {
  return notificationRepository.updatePreferences(userId, data);
}
