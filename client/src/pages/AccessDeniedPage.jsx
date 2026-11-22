import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-3 text-slate-600">You do not have permission to view this page.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Go home</Link>
    </section>
  );
}
