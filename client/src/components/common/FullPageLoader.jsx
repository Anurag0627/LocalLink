export default function FullPageLoader({ label = 'Loading LocalLink...' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        {label}
      </div>
    </div>
  );
}
