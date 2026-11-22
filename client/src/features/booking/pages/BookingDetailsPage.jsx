import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  cancelMyBooking,
  getMyBookingById,
  getProviderBookingById,
  acceptBooking,
  rejectBooking,
  completeBooking,
} from '../services/booking.service.js';
import BookingStatusBadge from '../components/BookingStatusBadge.jsx';
import BookingTimeline from '../components/BookingTimeline.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';
import { formatDate, formatTime, priceLabel } from '../utils/booking.utils.js';

export default function BookingDetailsPage({ role = 'CUSTOMER' }) {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [mutating, setMutating] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    const request = role === 'PROVIDER'
      ? getProviderBookingById(bookingId)
      : getMyBookingById(bookingId);
    request
      .then((response) => {
        if (active) setBooking(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [bookingId, role]);

  const mutate = async (action) => {
    setMutating(true);
    setError(null);
    setSuccess('');
    try {
      const response = await action();
      setBooking(response.data.data);
      setSuccess('Booking updated successfully.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating(false);
    }
  };

  if (loading) return <LoadingState label="Loading booking..." />;
  if (error && !booking) {
    const message = error.status === 404
      ? 'Booking not found or unavailable.'
      : error.message;
    return <div><ErrorState error={{ message }} /><button type="button" onClick={() => navigate(-1)} className="mt-4 font-semibold text-indigo-700">Back</button></div>;
  }
  if (!booking) return <EmptyState title="Booking not found" />;

  const snapshot = booking.serviceSnapshot;
  return (
    <section>
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={17} /> Back</button>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400">{booking.bookingNumber}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{snapshot?.title || 'LocalLink booking'}</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
      {success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="rounded-2xl border border-slate-100 bg-white p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div><dt className="text-sm text-slate-500">Appointment date</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(booking.scheduledDate)}</dd></div>
            <div><dt className="text-sm text-slate-500">Start time</dt><dd className="mt-1 font-semibold text-slate-900">{formatTime(booking.scheduledTime)}</dd></div>
            <div><dt className="text-sm text-slate-500">Duration</dt><dd className="mt-1 font-semibold text-slate-900">{booking.duration ? `${booking.duration} minutes` : 'Not specified'}</dd></div>
            <div><dt className="text-sm text-slate-500">Pricing</dt><dd className="mt-1 font-semibold text-indigo-700">{priceLabel(snapshot)}</dd></div>
          </dl>
          {booking.address && <div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Customer address snapshot</p><p className="mt-1 text-sm font-semibold text-slate-800">{booking.address.fullAddress}, {booking.address.city}, {booking.address.state} {booking.address.postalCode}</p></div>}
          {booking.locationSnapshot && <div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Location snapshot</p><p className="mt-1 text-sm font-semibold text-slate-800">{[booking.locationSnapshot.city, booking.locationSnapshot.state, booking.locationSnapshot.country].filter(Boolean).join(', ')}</p></div>}
          {booking.customerNote && <div className="mt-6"><p className="text-sm text-slate-500">Customer instructions</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{booking.customerNote}</p></div>}
        </main>
        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="font-bold text-slate-900">Lifecycle</h2>
          <div className="mt-4"><BookingTimeline booking={booking} /></div>
          {role === 'CUSTOMER' && ['PENDING', 'ACCEPTED'].includes(booking.status) && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <label className="text-sm font-semibold text-slate-700">Cancellation reason
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <button type="button" disabled={mutating || !reason.trim()} onClick={() => {
                if (window.confirm('Cancel this booking?')) mutate(() => cancelMyBooking(bookingId, reason.trim()));
              }} className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel booking</button>
            </div>
          )}
          {role === 'CUSTOMER' && booking.status === 'COMPLETED' && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <Link
                to={`/customer/bookings/${bookingId}/review`}
                className="block w-full rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Write a review
              </Link>
            </div>
          )}
          {role === 'PROVIDER' && (
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-5">
              {booking.status === 'PENDING' && (
                <>
                  <button type="button" disabled={mutating} onClick={() => {
                    if (window.confirm('Accept this booking?')) mutate(() => acceptBooking(bookingId));
                  }} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Accept</button>
                  <label className="block text-sm font-semibold text-slate-700">Rejection reason
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2" />
                  </label>
                  <button type="button" disabled={mutating || !reason.trim()} onClick={() => mutate(() => rejectBooking(bookingId, reason.trim()))} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Reject</button>
                </>
              )}
              {booking.status === 'ACCEPTED' && (
                <button type="button" disabled={mutating} onClick={() => {
                  if (window.confirm('Mark this booking as completed?')) mutate(() => completeBooking(bookingId));
                }} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Mark completed</button>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
