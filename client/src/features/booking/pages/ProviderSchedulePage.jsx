import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProviderSchedule } from '../services/booking.service.js';
import BookingStatusBadge from '../components/BookingStatusBadge.jsx';
import { formatDate, formatTime } from '../utils/booking.utils.js';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

export default function ProviderSchedulePage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;
    getProviderSchedule({ dateFrom })
      .then((response) => {
        if (active) setAppointments(response.data.data || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [dateFrom]);

  return (
    <div>
      <p className="font-semibold text-indigo-600">Calendar</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Schedule</h1>
      <label className="mt-6 block max-w-xs text-sm font-semibold text-slate-700">Appointments from
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" />
      </label>
      {loading && <div className="mt-6"><LoadingState label="Loading schedule..." /></div>}
      {!loading && error && <div className="mt-6"><ErrorState error={error} /></div>}
      {!loading && !error && appointments.length === 0 && <div className="mt-6"><EmptyState title="No upcoming appointments" description="Appointments for this date range will appear here." /></div>}
      {!loading && !error && appointments.length > 0 && (
        <div className="mt-6 space-y-3">
          {appointments.map((appointment) => (
            <Link key={appointment._id} to={`/provider/bookings/${appointment._id}`} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-slate-900">{appointment.serviceSnapshot?.title || 'LocalLink booking'}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDate(appointment.scheduledDate)} at {formatTime(appointment.scheduledTime)}</p>
              </div>
              <BookingStatusBadge status={appointment.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
