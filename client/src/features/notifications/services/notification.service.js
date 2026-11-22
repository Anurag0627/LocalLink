import api from '../../../lib/api.js';

export function getNotifications(params = {}) {
  return api.get('/notifications', { params });
}

export function getUnreadNotificationCount() {
  return api.get('/notifications/unread-count');
}

export function getNotificationById(notificationId) {
  return api.get(`/notifications/${notificationId}`);
}

export function markNotificationAsRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`);
}

export function markAllNotificationsAsRead() {
  return api.patch('/notifications/read-all');
}

export function deleteNotification(notificationId) {
  return api.delete(`/notifications/${notificationId}`);
}

export function getNotificationPreferences() {
  return api.get('/notifications/preferences');
}

export function updateNotificationPreferences(data) {
  return api.patch('/notifications/preferences', data);
}
