import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
      <p className="font-semibold text-indigo-600">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <Link
        to="/"
        className="mt-7 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
      >
        Back to home
      </Link>
    </section>
  );
}

export default NotFoundPage;
