export function notificationDestination(notification, role) {
  if (!notification?.resourceType || !notification?.resourceId) return '/notifications';
  const id = String(notification.resourceId);
  if (!/^[a-f\d]{24}$/i.test(id)) return '/notifications';
  if (notification.resourceType === 'BOOKING') {
    if (role === 'PROVIDER') return `/provider/bookings/${id}`;
    if (role === 'CUSTOMER') return `/customer/bookings/${id}`;
    if (role === 'ADMIN') return `/admin/bookings/${id}`;
  }
  if (notification.resourceType === 'REVIEW') {
    if (role === 'PROVIDER') return '/provider/reviews';
    if (role === 'CUSTOMER') return '/customer/reviews';
    if (role === 'ADMIN') return '/admin/reviews';
  }
  if (notification.resourceType === 'SERVICE') {
    if (role === 'CUSTOMER') return `/services/${id}`;
    if (role === 'PROVIDER') return `/provider/services/${id}/edit`;
    if (role === 'ADMIN') return '/admin/services';
  }
  return '/notifications';
}

export function formatNotificationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
