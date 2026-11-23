import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { getServiceById } from '../../customer/services/customer.service.js';
import { createBooking, getCustomerAddresses } from '../services/booking.service.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';
import { formatDate, formatTime, priceLabel } from '../utils/booking.utils.js';

const bookingSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  addressId: z.string().optional(),
  customerNote: z.string().trim().max(2000).optional(),
});

export default function CreateBookingPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [serviceData, setServiceData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ scheduledDate: '', scheduledTime: '', addressId: '', customerNote: '' });

  useEffect(() => {
    let active = true;
    Promise.all([
      getServiceById(serviceId),
      getCustomerAddresses(),
    ]).then(([serviceResponse, addressResponse]) => {
      if (!active) return;
      setServiceData(serviceResponse.data.data);
      setAddresses(addressResponse.data.data?.addresses || []);
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [serviceId]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    const { service } = serviceData;
    if (service.serviceLocationType === 'AT_CUSTOMER_LOCATION' && !form.addressId) {
      setError({ message: 'A saved address is required for this service.' });
      return;
    }
    const parsed = bookingSchema.safeParse(form);
    if (!parsed.success) {
      setError({ message: parsed.error.issues[0]?.message || 'Please complete the booking form.' });
      return;
    }
    const appointmentDate = new Date(`${parsed.data.scheduledDate}T${parsed.data.scheduledTime}`);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate.getTime() <= Date.now()) {
      setError({ message: 'Appointment must be scheduled for a future date and time.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        service: serviceId,
        scheduledDate: parsed.data.scheduledDate,
        scheduledTime: parsed.data.scheduledTime,
        ...(parsed.data.addressId ? { addressId: parsed.data.addressId } : {}),
        ...(parsed.data.customerNote ? { customerNote: parsed.data.customerNote } : {}),
      };
      const response = await createBooking(payload);
      navigate(`/customer/bookings/${response.data.data._id}`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading booking..." />;
  if (error && !serviceData) return <ErrorState error={error} />;
  if (!serviceData) return <ErrorState error={{ message: 'Service unavailable.' }} />;

  const { service, provider, category } = serviceData;
  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="font-semibold text-indigo-600">New booking</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Request an appointment</h1>
      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Appointment date
              <input type="date" value={form.scheduledDate} onChange={(event) => setField('scheduledDate', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Start time
              <input type="time" value={form.scheduledTime} onChange={(event) => setField('scheduledTime', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
            </label>
          </div>
          {service.availability?.length > 0 ? (
            <p className="text-sm text-slate-500">Configured service days: {service.availability.filter((item) => item.isAvailable).map((item) => `${item.day} ${item.startTime}-${item.endTime}`).join(', ') || 'No available days listed'}.</p>
          ) : (
            <p className="text-sm text-slate-500">No service availability is listed. The backend will validate the requested appointment.</p>
          )}
          {service.serviceLocationType === 'AT_CUSTOMER_LOCATION' && (
            <label className="block text-sm font-semibold text-slate-700">Saved address
              {addresses.length === 0 ? (
                <span className="mt-2 block rounded-xl bg-amber-50 p-4 text-sm font-normal text-amber-800">No saved addresses are available. Add one from your customer profile before booking.</span>
              ) : (
                <select value={form.addressId} onChange={(event) => setField('addressId', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none">
                  <option value="">Select an address</option>
                  {addresses.map((address) => <option key={address._id} value={address._id}>{address.fullAddress}, {address.city}, {address.state} {address.postalCode}</option>)}
                </select>
              )}
            </label>
          )}
          {service.serviceLocationType === 'AT_PROVIDER_LOCATION' && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This appointment takes place at the provider location shown by the service or provider.</p>}
          {service.serviceLocationType === 'REMOTE' && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This is a remote service. No physical address is required.</p>}
          <label className="block text-sm font-semibold text-slate-700">Instructions for the provider
            <textarea value={form.customerNote} onChange={(event) => setField('customerNote', event.target.value)} maxLength="2000" rows="4" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
          </label>
          <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Request booking'}</button>
        </div>
        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 lg:sticky lg:top-24">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Booking summary</p>
          <h2 className="mt-2 font-bold text-slate-900">{service.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{category?.name}</p>
          <p className="mt-3 font-bold text-indigo-700">{priceLabel(service)}</p>
          <p className="mt-4 text-sm text-slate-600">Provider: {provider?.businessName || 'LocalLink provider'}</p>
          {form.scheduledDate && <p className="mt-3 text-sm text-slate-600">{formatDate(form.scheduledDate)}{form.scheduledTime ? ` at ${formatTime(form.scheduledTime)}` : ''}</p>}
          {service.pricingType === 'QUOTE' && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Quote-based services do not include a fixed price. Final pricing is handled outside this booking form.</p>}
        </aside>
      </form>
    </section>
  );
}
