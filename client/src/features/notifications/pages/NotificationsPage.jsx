import { useEffect, useState } from 'react';
import { CheckCheck, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/useAuth.js';
import { useNotificationsContext } from '../context/useNotifications.js';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service.js';
import NotificationTypeIcon from '../components/NotificationTypeIcon.jsx';
import Pagination from '../../customer/components/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';
import { formatNotificationTime, notificationDestination } from '../utils/notification.utils.js';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotificationsContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState('');
  const page = Number(searchParams.get('page') || 1);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const type = searchParams.get('type') || '';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getNotifications({
        page,
        limit: 10,
        ...(unreadOnly ? { unreadOnly: 'true' } : {}),
        ...(type ? { type } : {}),
      });
      setNotifications(response.data.data || []);
      setMeta(response.data.meta || {});
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getNotifications({
      page,
      limit: 10,
      ...(unreadOnly ? { unreadOnly: 'true' } : {}),
      ...(type ? { type } : {}),
    }).then((response) => {
      if (!active) return;
      setNotifications(response.data.data || []);
      setMeta(response.data.meta || {});
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, unreadOnly, type]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const markRead = async (notification) => {
    if (notification.isRead || mutating) return;
    setMutating(notification._id);
    try {
      await markNotificationAsRead(notification._id);
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
      await refreshUnreadCount();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating('');
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    navigate(notificationDestination(notification, user?.role));
  };

  const markAll = async () => {
    setMutating('all');
    setError(null);
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      await refreshUnreadCount();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating('');
    }
  };

  const remove = async (notificationId) => {
    if (!window.confirm('Delete this notification?')) return;
    setMutating(notificationId);
    setError(null);
    try {
      await deleteNotification(notificationId);
      setNotifications((current) => current.filter((item) => item._id !== notificationId));
      await refreshUnreadCount();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating('');
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-indigo-600">Inbox</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw size={15} /> Refresh</button>
          {notifications.some((item) => !item.isRead) && (
            <button type="button" disabled={mutating === 'all'} onClick={markAll} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><CheckCheck size={15} /> Mark all read</button>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <select value={unreadOnly ? 'true' : ''} onChange={(event) => updateFilter('unreadOnly', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All notifications</option>
          <option value="true">Unread only</option>
        </select>
        <select value={type} onChange={(event) => updateFilter('type', event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="BOOKING_CREATED">Booking created</option>
          <option value="BOOKING_ACCEPTED">Booking accepted</option>
          <option value="BOOKING_REJECTED">Booking rejected</option>
          <option value="BOOKING_CANCELLED">Booking cancelled</option>
          <option value="BOOKING_COMPLETED">Booking completed</option>
          <option value="REVIEW_RECEIVED">Review received</option>
          <option value="REVIEW_HIDDEN">Review hidden</option>
          <option value="REVIEW_RESTORED">Review restored</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>
      {loading && <div className="mt-6"><LoadingState label="Loading notifications..." /></div>}
      {!loading && error && <div className="mt-6"><ErrorState error={error} /></div>}
      {!loading && !error && notifications.length === 0 && <div className="mt-6"><EmptyState title="No notifications" description="You're all caught up." /></div>}
      {!loading && !error && notifications.length > 0 && (
        <>
          <div className="mt-6 space-y-3">
            {notifications.map((notification) => (
              <article key={notification._id} className={`rounded-2xl border p-4 ${notification.isRead ? 'border-slate-100 bg-white' : 'border-indigo-100 bg-indigo-50/40'}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"><NotificationTypeIcon type={notification.type} /></span>
                  <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatNotificationTime(notification.createdAt)}</p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {!notification.isRead && (
                      <button type="button" disabled={mutating === notification._id} aria-label={`Mark ${notification.title} as read`} onClick={() => markRead(notification)} className="rounded-lg border border-slate-200 p-2 text-indigo-700"><CheckCheck size={16} /></button>
                    )}
                    <button type="button" disabled={mutating === notification._id} aria-label={`Delete ${notification.title}`} onClick={() => remove(notification._id)} className="rounded-lg border border-slate-200 p-2 text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages}
              onPageChange={(nextPage) => updateFilter('page', String(nextPage))}
            />
          </div>
        </>
      )}
    </section>
  );
}
