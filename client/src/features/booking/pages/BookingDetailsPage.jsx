import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  MapPin,
  Timer,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
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

function BookingDetail({ icon: Icon, label, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={16} className="text-indigo-600" />
        <dt>{label}</dt>
      </div>
      <dd className="mt-2 font-semibold leading-6 text-slate-900">{children}</dd>
    </div>
  );
}

function getBookingEndTime(booking) {
  const date = new Date(booking.scheduledDate);
  const timeParts = booking.scheduledTime?.split(':').map(Number);
  if (
    Number.isNaN(date.getTime())
    || timeParts?.length !== 2
    || !timeParts.every(Number.isInteger)
    || timeParts[0] < 0
    || timeParts[0] > 23
    || timeParts[1] < 0
    || timeParts[1] > 59
  ) {
    return null;
  }

  const startTime = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    timeParts[0],
    timeParts[1],
  );
  return startTime + (booking.duration ?? 60) * 60 * 1000;
}

export default function BookingDetailsPage({ role = 'CUSTOMER' }) {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [mutating, setMutating] = useState(false);
  const [reason, setReason] = useState('');
  const [currentTime, setCurrentTime] = useState(0);

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

  useEffect(() => {
    if (role !== 'PROVIDER' || booking?.status !== 'ACCEPTED') return undefined;
    const updateTime = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateTime, 0);
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, [booking?.status, role]);

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
    return (
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <ErrorState error={{ message }} />
        <button type="button" onClick={() => navigate(-1)} className="mt-5 inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-900">
          <ArrowLeft size={17} /> Back
        </button>
      </section>
    );
  }
  if (!booking) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <EmptyState title="Booking not found" />
      </section>
    );
  }

  const snapshot = booking.serviceSnapshot;
  const canCancel = role === 'CUSTOMER' && ['PENDING', 'ACCEPTED'].includes(booking.status);
  const canReview = role === 'CUSTOMER' && booking.status === 'COMPLETED';
  const canProviderRespond = role === 'PROVIDER' && ['PENDING', 'ACCEPTED'].includes(booking.status);
  const bookingEndTime = getBookingEndTime(booking);
  const canComplete = bookingEndTime !== null && currentTime >= bookingEndTime;
  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
        <ArrowLeft size={17} /> Back to bookings
      </button>

      <header className="mt-6 rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 p-6 text-white shadow-lg shadow-indigo-950/10 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Booking details</p>
            <h1 className="mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
              {snapshot?.title || 'LocalLink booking'}
            </h1>
            {booking.bookingNumber && (
              <p className="mt-2 text-sm text-indigo-100">
                Booking reference <span className="font-bold text-white">{booking.bookingNumber}</span>
              </p>
            )}
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
      </header>

      {error && <div className="mt-5"><Alert>{error.message}</Alert></div>}
      {success && <div className="mt-5"><Alert type="success">{success}</Alert></div>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-6">
          <section aria-labelledby="appointment-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <CalendarDays size={21} />
              </span>
              <div>
                <h2 id="appointment-heading" className="text-lg font-bold text-slate-900">Appointment summary</h2>
                <p className="mt-1 text-sm text-slate-500">Review the scheduled time and booking price.</p>
              </div>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <BookingDetail icon={CalendarDays} label="Date">{formatDate(booking.scheduledDate)}</BookingDetail>
              <BookingDetail icon={Clock3} label="Start time">{formatTime(booking.scheduledTime)}</BookingDetail>
              <BookingDetail icon={Timer} label="Duration">{booking.duration ? `${booking.duration} minutes` : 'Not specified'}</BookingDetail>
              <BookingDetail icon={CircleDollarSign} label="Pricing">{priceLabel(snapshot)}</BookingDetail>
            </dl>
          </section>

          {(booking.address || booking.locationSnapshot) && (
            <section aria-labelledby="location-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <MapPin size={21} />
                </span>
                <div>
                  <h2 id="location-heading" className="text-lg font-bold text-slate-900">Service location</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.address
                      ? (role === 'PROVIDER' ? 'Customer address saved with this booking.' : 'Address saved with this booking.')
                      : 'Provider location saved with this booking.'}
                  </p>
                </div>
              </div>
              <address className="mt-5 rounded-2xl bg-slate-50 p-4 not-italic">
                {booking.address ? (
                  <>
                    {booking.address.label && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{booking.address.label}</p>}
                    <p className="font-semibold leading-6 text-slate-900">{booking.address.fullAddress}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {[booking.address.city, booking.address.state, booking.address.postalCode].filter(Boolean).join(', ')}
                    </p>
                    {booking.address.country && <p className="text-sm text-slate-600">{booking.address.country}</p>}
                  </>
                ) : (
                  <p className="font-semibold leading-6 text-slate-900">
                    {[booking.locationSnapshot.city, booking.locationSnapshot.state, booking.locationSnapshot.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </address>
            </section>
          )}

          {booking.customerNote && (
            <section aria-labelledby="instructions-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <ClipboardList size={21} />
                </span>
                <div>
                  <h2 id="instructions-heading" className="text-lg font-bold text-slate-900">Customer instructions</h2>
                  <p className="mt-1 text-sm text-slate-500">Notes included with the booking request.</p>
                </div>
              </div>
              <p className="mt-5 whitespace-pre-line break-words rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{booking.customerNote}</p>
            </section>
          )}
        </main>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><CheckCircle2 size={20} /></span>
              <div>
                <h2 className="font-bold text-slate-900">Booking timeline</h2>
                <p className="text-sm text-slate-500">Status history</p>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <BookingTimeline booking={booking} />
            </div>
          </section>

          {(canCancel || canReview || canProviderRespond) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-bold text-slate-900">Next steps</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {role === 'CUSTOMER'
                  ? (canReview ? 'Share your experience with this provider.' : 'Manage this appointment.')
                  : 'Respond to this customer booking.'}
              </p>
              {canCancel && (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  <label htmlFor="booking-cancel-reason" className="block text-sm font-semibold text-slate-700">
                    Cancellation reason
                    <textarea
                      id="booking-cancel-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows="3"
                      maxLength="1000"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={mutating || !reason.trim()}
                    onClick={() => {
                      if (window.confirm('Cancel this booking?')) {
                        mutate(() => cancelMyBooking(bookingId, reason.trim()));
                      }
                    }}
                    className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mutating ? 'Updating...' : 'Cancel booking'}
                  </button>
                </div>
              )}
              {canReview && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <Link
                    to={`/customer/bookings/${bookingId}/review`}
                    className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Write a review
                  </Link>
                </div>
              )}
              {canProviderRespond && (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  {booking.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        disabled={mutating}
                        onClick={() => {
                          if (window.confirm('Accept this booking?')) {
                            mutate(() => acceptBooking(bookingId));
                          }
                        }}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mutating ? 'Updating...' : 'Accept booking'}
                      </button>
                      <label htmlFor="booking-reject-reason" className="block text-sm font-semibold text-slate-700">
                        Rejection reason
                        <textarea
                          id="booking-reject-reason"
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          rows="3"
                          maxLength="1000"
                          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={mutating || !reason.trim()}
                        onClick={() => mutate(() => rejectBooking(bookingId, reason.trim()))}
                        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mutating ? 'Updating...' : 'Reject booking'}
                      </button>
                    </>
                  )}
                  {booking.status === 'ACCEPTED' && (
                    <>
                      {!canComplete && (
                        <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                          Completion will be available after the scheduled appointment end time.
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={mutating || !canComplete}
                        onClick={() => {
                          if (window.confirm('Mark this booking as completed?')) {
                            mutate(() => completeBooking(bookingId));
                          }
                        }}
                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mutating ? 'Updating...' : 'Mark completed'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
