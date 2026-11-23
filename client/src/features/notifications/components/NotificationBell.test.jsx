import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';

vi.mock('../../auth/context/useAuth.js', () => ({
  useAuth: () => ({ user: { role: 'CUSTOMER' } }),
}));

vi.mock('../context/useNotifications.js', () => ({
  useNotificationsContext: () => ({
    unreadCount: 3,
    refreshUnreadCount: vi.fn(),
    setUnreadCount: vi.fn(),
  }),
}));

vi.mock('../services/notification.service.js', () => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

import { getNotifications } from '../services/notification.service.js';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('shows unread count and opens the dropdown', async () => {
    getNotifications.mockResolvedValue({
      data: {
        data: [{ _id: '507f1f77bcf86cd799439011', type: 'SYSTEM', title: 'Welcome', message: 'Welcome to LocalLink', isRead: false }],
      },
    });
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /notifications, 3 unread/i }));
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
  });

  it('provides view all navigation', async () => {
    getNotifications.mockResolvedValue({ data: { data: [] } });
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await screen.findByRole('link', { name: 'View all notifications' })).toHaveAttribute('href', '/notifications');
  });
});
