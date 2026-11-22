import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notification.service.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

const preferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  bookingNotifications: z.boolean(),
  reviewNotifications: z.boolean(),
  systemNotifications: z.boolean(),
});

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState({
    inAppEnabled: true,
    bookingNotifications: true,
    reviewNotifications: true,
    systemNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getNotificationPreferences()
      .then((response) => {
        if (active) setPreferences((current) => ({ ...current, ...(response.data.data || {}) }));
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const setField = (field, value) => setPreferences((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess('');
    const parsed = preferenceSchema.safeParse(preferences);
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message || 'Invalid preferences.' });
      return;
    }
    setSaving(true);
    try {
      const response = await updateNotificationPreferences(parsed.data);
      setPreferences({ ...preferences, ...(response.data.data || {}) });
      setSuccess('Notification preferences updated.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading preferences..." />;

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="font-semibold text-indigo-600">Settings</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Notification preferences</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">These settings control whether future in-app notifications are created. Existing notifications remain in your inbox.</p>
      {error && <div className="mt-5"><ErrorState error={error} /></div>}
      {success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-white p-5">
        {[
          ['inAppEnabled', 'In-app notifications', 'Enable general in-app notification delivery.'],
          ['bookingNotifications', 'Booking notifications', 'Receive booking request and status notifications.'],
          ['reviewNotifications', 'Review notifications', 'Receive review and moderation notifications.'],
          ['systemNotifications', 'System notifications', 'Receive general LocalLink system notifications.'],
        ].map(([field, label, description]) => (
          <label key={field} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50">
            <input type="checkbox" checked={preferences[field]} onChange={(event) => setField(field, event.target.checked)} className="mt-1 h-5 w-5 accent-indigo-600" />
            <span><span className="block text-sm font-bold text-slate-800">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
          </label>
        ))}
        <button type="submit" disabled={saving} className="mt-3 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save preferences'}</button>
      </form>
    </section>
  );
}
