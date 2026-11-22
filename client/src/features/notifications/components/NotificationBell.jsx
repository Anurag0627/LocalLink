import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/useAuth.js';
import { useNotificationsContext } from '../context/NotificationContext.jsx';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service.js';
import NotificationTypeIcon from './NotificationTypeIcon.jsx';
import { formatNotificationTime, notificationDestination } from '../utils/notification.utils.js';

export default function NotificationBell() {
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount, setUnreadCount } = useNotificationsContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getNotifications({ page: 1, limit: 5 });
      setNotifications(response.data.data || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) load();
    setOpen((current) => !current);
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
        await refreshUnreadCount();
      } catch {
        // The destination remains available even if marking as read fails.
      }
    }
    setOpen(false);
    navigate(notificationDestination(notification, user?.role));
  };

  const readAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notifications as read.');
    }
  };

  const label = unreadCount > 99 ? '99+' : String(unreadCount);
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {label}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={readAll} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {loading && <p className="p-4 text-sm text-slate-500">Loading...</p>}
            {!loading && error && <p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
            {!loading && !error && notifications.length === 0 && <p className="p-5 text-center text-sm text-slate-500">No notifications yet.</p>}
            {!loading && notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left ${notification.isRead ? 'hover:bg-slate-50' : 'bg-indigo-50/60 hover:bg-indigo-50'}`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white"><NotificationTypeIcon type={notification.type} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{notification.title}</span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{notification.message}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{formatNotificationTime(notification.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-indigo-700">View all notifications</Link>
        </div>
      )}
    </div>
  );
}
