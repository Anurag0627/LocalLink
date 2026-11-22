import { useEffect, useState } from 'react';
import { getIncomingBookings } from '../services/booking.service.js';
import { bookingStatuses } from '../utils/booking.utils.js';
import BookingCard from '../components/BookingCard.jsx';
import Pagination from '../../customer/components/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({});
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getIncomingBookings({ page, limit: 10, ...(status ? { status } : {}), sortBy: 'createdAt', order: 'desc' })
      .then((response) => {
        if (!active) return;
        setBookings(response.data.data || []);
        setMeta(response.data.meta || {});
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, status]);

  return (
    <div>
      <p className="font-semibold text-indigo-600">Appointments</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Incoming bookings</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => { setStatus(''); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${status === '' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>All</button>
        {bookingStatuses.map((value) => (
          <button key={value} type="button" onClick={() => { setStatus(value); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${status === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>{value.charAt(0) + value.slice(1).toLowerCase()}</button>
        ))}
      </div>
      {loading && <div className="mt-6"><LoadingState label="Loading incoming bookings..." /></div>}
      {!loading && error && <div className="mt-6"><ErrorState error={error} /></div>}
      {!loading && !error && bookings.length === 0 && <div className="mt-6"><EmptyState title="No incoming bookings" description="New appointment requests will appear here." /></div>}
      {!loading && !error && bookings.length > 0 && (
        <>
          <div className="mt-6 space-y-4">{bookings.map((booking) => <BookingCard key={booking._id} booking={booking} detailBase="/provider/bookings" />)}</div>
          <div className="mt-6"><Pagination page={meta.page || page} totalPages={meta.totalPages} onPageChange={setPage} /></div>
        </>
      )}
    </div>
  );
}
