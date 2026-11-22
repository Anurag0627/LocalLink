import { useEffect, useState } from 'react';
import {
  createProviderServiceArea,
  deleteProviderServiceArea,
  getProviderServiceAreas,
  updateProviderServiceArea,
} from '../services/provider.service.js';
import { serviceAreaSchema } from '../schemas/provider.schema.js';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

const blankArea = { city: '', state: '', country: '', postalCodesText: '' };

export default function ProviderServiceAreasPage() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(blankArea);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProviderServiceAreas();
      setAreas(response.data.data?.serviceAreas || []);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getProviderServiceAreas()
      .then((response) => {
        if (active) setAreas(response.data.data?.serviceAreas || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    const parsed = serviceAreaSchema.safeParse(form);
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message || 'Please correct the service area.' });
      return;
    }
    const postalCodes = parsed.data.postalCodesText
      ? parsed.data.postalCodesText.split(',').map((value) => value.trim()).filter(Boolean)
      : [];
    const payload = {
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
      postalCodes,
    };
    setSaving(true);
    try {
      if (editingId) await updateProviderServiceArea(editingId, payload);
      else await createProviderServiceArea(payload);
      setForm(blankArea);
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const edit = (area) => {
    setEditingId(area._id);
    setForm({
      city: area.city || '',
      state: area.state || '',
      country: area.country || '',
      postalCodesText: (area.postalCodes || []).join(', '),
    });
  };

  const remove = async (areaId) => {
    if (!window.confirm('Remove this service area?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProviderServiceArea(areaId);
      await load();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="font-semibold text-indigo-600">Locations</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Service Areas</h1>
      {error && <div className="mt-5"><ErrorState error={error} /></div>}
      <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 md:grid-cols-2">
        {[
          ['city', 'City'],
          ['state', 'State'],
          ['country', 'Country'],
          ['postalCodesText', 'Postal codes (comma separated)'],
        ].map(([field, label]) => (
          <label key={field} className="text-sm font-semibold text-slate-700">{label}
            <input value={form[field]} onChange={(event) => setField(field, event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
          </label>
        ))}
        <div className="flex items-end gap-2 md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update area' : 'Add area'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blankArea); }} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Cancel</button>}
        </div>
      </form>
      {loading && <div className="mt-6"><LoadingState label="Loading service areas..." /></div>}
      {!loading && areas.length === 0 && <div className="mt-6"><EmptyState title="No service areas" description="Add locations where you provide services." /></div>}
      {!loading && areas.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {areas.map((area) => (
            <article key={area._id} className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="font-bold text-slate-900">{[area.city, area.state, area.country].filter(Boolean).join(', ')}</h2>
              {area.postalCodes?.length > 0 && <p className="mt-2 text-sm text-slate-500">Postal codes: {area.postalCodes.join(', ')}</p>}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => edit(area)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Edit</button>
                <button type="button" onClick={() => remove(area._id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
