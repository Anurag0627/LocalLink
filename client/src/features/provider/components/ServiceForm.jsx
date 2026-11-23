import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getActiveCategories,
  getProviderProfile,
} from '../services/provider.service.js';
import { serviceSchema } from '../schemas/provider.schema.js';

const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function ServiceForm({ initialData, submitLabel, onSubmit, submittingText = 'Saving...' }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [values, setValues] = useState({
    category: initialData?.category?._id || initialData?.category || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    imageUrls: initialData?.images?.join('\n') || '',
    pricingType: initialData?.pricingType || 'FIXED',
    price: initialData?.price ?? '',
    estimatedDuration: initialData?.estimatedDuration ?? '',
    serviceLocationType: initialData?.serviceLocationType || 'AT_CUSTOMER_LOCATION',
  });
  const [availability, setAvailability] = useState(
    initialData?.availability?.length
      ? weekdays.map((day) => initialData.availability.find((item) => item.day === day) || { day, isAvailable: false })
      : weekdays.map((day) => ({ day, isAvailable: false })),
  );
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getActiveCategories()
      .then((response) => {
        if (active) setCategories(response.data.data || []);
      })
      .catch((requestError) => {
        if (active) setError((current) => current || requestError);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    getProviderProfile()
      .then((response) => {
        if (active) setVerificationStatus(response.data.data.profile?.verificationStatus || '');
      })
      .catch((requestError) => {
        if (active) setError((current) => current || requestError);
      });
    return () => { active = false; };
  }, []);

  const setField = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    const parsed = serviceSchema.safeParse(values);
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message || 'Please correct the form.' });
      return;
    }

    const payload = {
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      images: parsed.data.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
      pricingType: parsed.data.pricingType,
      serviceLocationType: parsed.data.serviceLocationType,
    };
    if (parsed.data.pricingType !== 'QUOTE' && parsed.data.price !== '' && parsed.data.price !== undefined) {
      payload.price = Number(parsed.data.price);
    }
    if (parsed.data.estimatedDuration !== '' && parsed.data.estimatedDuration !== undefined) {
      payload.estimatedDuration = Number(parsed.data.estimatedDuration);
    }
    const includedAvailability = availability.filter((item) => item.isAvailable);
    for (const item of includedAvailability) {
      if (!item.startTime || !item.endTime || item.startTime >= item.endTime) {
        setError({ message: `Choose valid start and end times for ${item.day}.` });
        return;
      }
    }
    payload.availability = availability.filter((item) => item.isAvailable || item.startTime || item.endTime).map((item) => ({
      day: item.day,
      isAvailable: item.isAvailable,
      ...(item.isAvailable ? { startTime: item.startTime, endTime: item.endTime } : {}),
    }));

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6">
      {verificationStatus !== 'VERIFIED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Verification required:</strong> the backend may restrict creating or activating services until your account is verified.
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Service title
          <input value={values.title} onChange={(event) => setField('title', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Category
          <select disabled={categoriesLoading || categories.length === 0} value={values.category} onChange={(event) => setField('category', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none disabled:bg-slate-100">
            <option value="">{categoriesLoading ? 'Loading categories...' : 'Select category'}</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </label>
      </div>
      {!categoriesLoading && categories.length === 0 && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active categories are available. An administrator must create or activate a category before you can add a service.
        </p>
      )}
      <label className="block text-sm font-semibold text-slate-700">Description
        <textarea value={values.description} onChange={(event) => setField('description', event.target.value)} rows="5" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
      </label>
      <div>
        <label htmlFor="service-image-urls" className="block text-sm font-semibold text-slate-700">
          Service image URLs (one per line, optional)
        </label>
        <textarea
          id="service-image-urls"
          value={values.imageUrls}
          onChange={(event) => setField('imageUrls', event.target.value)}
          rows="3"
          placeholder="https://example.com/service-photo.jpg"
          aria-describedby="service-image-help"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500"
        />
        <p id="service-image-help" className="mt-1 text-xs text-slate-500">
          Add up to 20 HTTP or HTTPS image URLs. The first image is shown on service cards.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Pricing type
          <select value={values.pricingType} onChange={(event) => setField('pricingType', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none">
            <option value="FIXED">Fixed</option>
            <option value="HOURLY">Hourly</option>
            <option value="STARTING_FROM">Starting from</option>
            <option value="QUOTE">Quote</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Price
          <input type="number" min="0" disabled={values.pricingType === 'QUOTE'} value={values.pricingType === 'QUOTE' ? '' : values.price} onChange={(event) => setField('price', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none disabled:bg-slate-100" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Duration (minutes)
          <input type="number" min="1" value={values.estimatedDuration} onChange={(event) => setField('estimatedDuration', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">Service location
        <select value={values.serviceLocationType} onChange={(event) => setField('serviceLocationType', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none">
          <option value="AT_CUSTOMER_LOCATION">At customer location</option>
          <option value="AT_PROVIDER_LOCATION">At provider location</option>
          <option value="REMOTE">Remote</option>
        </select>
      </label>
      <fieldset>
        <legend className="text-sm font-bold text-slate-900">Service weekly availability</legend>
        <p className="mt-1 text-xs text-slate-500">This is separate from your general provider availability.</p>
        <div className="mt-3 space-y-2">
          {availability.map((item, index) => (
            <div key={item.day} className="grid items-center gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[150px_1fr_1fr]">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={item.isAvailable} onChange={(event) => setAvailability((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, isAvailable: event.target.checked } : day))} />
                {item.day}
              </label>
              {item.isAvailable && (
                <>
                  <input aria-label={`${item.day} start time`} type="time" value={item.startTime || ''} onChange={(event) => setAvailability((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, startTime: event.target.value } : day))} className="rounded-lg border border-slate-200 px-3 py-2" />
                  <input aria-label={`${item.day} end time`} type="time" value={item.endTime || ''} onChange={(event) => setAvailability((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, endTime: event.target.value } : day))} className="rounded-lg border border-slate-200 px-3 py-2" />
                </>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-3">
        <button type="submit" disabled={submitting || categoriesLoading || categories.length === 0} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? submittingText : submitLabel}</button>
        <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">Cancel</button>
      </div>
    </form>
  );
}
