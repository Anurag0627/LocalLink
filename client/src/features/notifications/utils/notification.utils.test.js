import { describe, expect, it } from 'vitest';
import {
  formatNotificationTime,
  notificationDestination,
} from './notification.utils.js';

describe('notification.utils', () => {
  const validId = '507f1f77bcf86cd799439011';

  it('routes BOOKING notifications according to role', () => {
    const notification = { resourceType: 'BOOKING', resourceId: validId };
    expect(notificationDestination(notification, 'CUSTOMER')).toBe(`/customer/bookings/${validId}`);
    expect(notificationDestination(notification, 'PROVIDER')).toBe(`/provider/bookings/${validId}`);
    expect(notificationDestination(notification, 'ADMIN')).toBe(`/admin/bookings/${validId}`);
  });

  it('routes REVIEW notifications according to role', () => {
    const notification = { resourceType: 'REVIEW', resourceId: validId };
    expect(notificationDestination(notification, 'CUSTOMER')).toBe('/customer/reviews');
    expect(notificationDestination(notification, 'PROVIDER')).toBe('/provider/reviews');
    expect(notificationDestination(notification, 'ADMIN')).toBe('/admin/reviews');
  });

  it('routes SERVICE notifications according to role', () => {
    const notification = { resourceType: 'SERVICE', resourceId: validId };
    expect(notificationDestination(notification, 'CUSTOMER')).toBe(`/services/${validId}`);
    expect(notificationDestination(notification, 'PROVIDER')).toBe(`/provider/services/${validId}/edit`);
    expect(notificationDestination(notification, 'ADMIN')).toBe('/admin/services');
  });

  it('safely handles missing or malformed resources', () => {
    expect(notificationDestination(null, 'CUSTOMER')).toBe('/notifications');
    expect(notificationDestination({ resourceType: 'BOOKING' }, 'CUSTOMER')).toBe('/notifications');
    expect(notificationDestination({ resourceType: 'BOOKING', resourceId: 'not-an-id' }, 'CUSTOMER')).toBe('/notifications');
  });

  it('formats notification time accurately', () => {
    expect(formatNotificationTime(null)).toBe('');
    expect(formatNotificationTime('invalid-date')).toBe('');
    const formatted = formatNotificationTime('2026-11-20T14:30:00.000Z');
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});
