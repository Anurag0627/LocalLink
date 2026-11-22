const styles = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-indigo-50 text-indigo-700',
};

export default function BookingStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown'}
    </span>
  );
}
