export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-500" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center" role="alert">
      <p className="font-bold text-red-800">We couldn't load this information</p>
      <p className="mt-1 text-sm text-red-700">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'No results found', description = 'Try changing your search or filters.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
