import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/context/useAuth.js';
import { getUnreadNotificationCount } from '../services/notification.service.js';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }
    try {
      const response = await getUnreadNotificationCount();
      const count = response.data.data?.count ?? 0;
      setUnreadCount(count);
      return count;
    } catch {
      return unreadCount;
    }
  }, [isAuthenticated, unreadCount]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      Promise.resolve().then(() => {
        if (active) setUnreadCount(0);
      });
      return () => { active = false; };
    }
    getUnreadNotificationCount()
      .then((response) => {
        if (active) setUnreadCount(response.data.data?.count ?? 0);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => { active = false; };
  }, [isAuthenticated, user?._id]);

  const value = useMemo(() => ({
    unreadCount,
    setUnreadCount,
    refreshUnreadCount,
  }), [unreadCount, refreshUnreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationsContext() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationsContext must be used within NotificationProvider');
  return context;
}
