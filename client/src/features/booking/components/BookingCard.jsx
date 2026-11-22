import { CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import BookingStatusBadge from './BookingStatusBadge.jsx';
import { formatDate, formatTime, priceLabel } from '../utils/booking.utils.js';

export default function BookingCard({ booking, detailBase = '/customer/bookings' }) {
  const snapshot = booking.serviceSnapshot;
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <BookingStatusBadge status={booking.status} />
            {booking.bookingNumber && <span className="text-xs font-bold text-slate-400">{booking.bookingNumber}</span>}
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-900">{snapshot?.title || 'LocalLink service'}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}</span>
            {booking.locationSnapshot?.city && (
              <span className="inline-flex items-center gap-2"><MapPin size={16} /> {booking.locationSnapshot.city}{booking.locationSnapshot.state ? `, ${booking.locationSnapshot.state}` : ''}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="font-bold text-indigo-700">{priceLabel(snapshot)}</p>
          <Link to={`${detailBase}/${booking._id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-700">View details</Link>
        </div>
      </div>
    </article>
  );
}
