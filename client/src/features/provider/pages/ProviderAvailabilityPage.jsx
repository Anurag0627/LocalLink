import { useEffect, useState } from 'react';
import {
  getProviderAvailability,
  updateProviderAvailability,
} from '../services/provider.service.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function ProviderAvailabilityPage() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    getProviderAvailability()
      .then((response) => {
        if (active) setIsAvailable(Boolean(response.data.data.profile?.isAvailable));
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      await updateProviderAvailability(isAvailable);
      setSuccess('Provider availability updated.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading availability..." />;

  return (
    <div className="max-w-2xl">
      <p className="font-semibold text-indigo-600">Business availability</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Availability</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">This controls whether your provider profile is generally available. Individual service weekly availability is managed in each service form.</p>
      {error && <div className="mt-5"><ErrorState error={error} /></div>}
      {success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}
      <form onSubmit={save} className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
          <input type="checkbox" checked={isAvailable} onChange={(event) => setIsAvailable(event.target.checked)} className="h-5 w-5 accent-indigo-600" />
          Accepting new service availability
        </label>
        <button type="submit" disabled={saving} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save availability'}</button>
      </form>
    </div>
  );
}
