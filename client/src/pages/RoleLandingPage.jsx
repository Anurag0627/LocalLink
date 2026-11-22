export default function RoleLandingPage({ role }) {
  const title = role === 'ADMIN' ? 'Admin' : role === 'PROVIDER' ? 'Provider' : 'Customer';
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <p className="font-semibold text-indigo-600">{title} workspace</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome to LocalLink</h1>
      <p className="mt-3 max-w-xl leading-7 text-slate-600">
        Your {title.toLowerCase()} account is ready. Marketplace workspace features will appear here in later phases.
      </p>
    </section>
  );
}
