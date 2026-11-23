export function StatusBadge({ value }) {
  const positive = ['ACTIVE', 'VERIFIED', 'PUBLISHED', 'COMPLETED', 'true'].includes(String(value).toUpperCase());
  const warning = ['PENDING', 'ACCEPTED'].includes(String(value).toUpperCase());
  const tone = positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{value || 'Unknown'}</span>;
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
      {action}
    </div>
  );
}

export function EmptyState({ message = 'No records found.' }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">{message}</div>;
}

