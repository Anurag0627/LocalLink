import { formatDate } from '../utils/booking.utils.js';

const steps = [
  ['PENDING', 'createdAt', 'Booking requested'],
  ['ACCEPTED', 'updatedAt', 'Booking accepted'],
  ['REJECTED', 'rejectedAt', 'Booking rejected'],
  ['CANCELLED', 'cancelledAt', 'Booking cancelled'],
  ['COMPLETED', 'completedAt', 'Booking completed'],
];

export default function BookingTimeline({ booking }) {
  const status = booking?.status;
  return (
    <ol className="space-y-4">
      {steps.map(([stepStatus, timestampField, label]) => {
        const timestamp = stepStatus === 'PENDING'
          ? booking?.createdAt
          : stepStatus === 'ACCEPTED'
            ? (status === 'ACCEPTED' || status === 'COMPLETED') ? booking?.updatedAt : null
            : booking?.[timestampField];
        const isCurrent = status === stepStatus;
        const isHistorical = Boolean(timestamp);
        if (!isCurrent && !isHistorical) return null;
        return (
          <li key={stepStatus} className="flex items-start gap-3">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-300'}`} />
            <div>
              <p className={`font-semibold ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</p>
              {timestamp && <p className="mt-1 text-xs text-slate-500">{formatDate(timestamp)}</p>}
            </div>
          </li>
        );
      })}
      {status === 'REJECTED' && booking.rejectionReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Reason: {booking.rejectionReason}</p>}
      {status === 'CANCELLED' && booking.cancellationReason && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Reason: {booking.cancellationReason}</p>}
    </ol>
  );
}
