import { ArrowLeft, BriefcaseBusiness } from 'lucide-react';
import { Link } from 'react-router-dom';

function ExploreServicesPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <BriefcaseBusiness size={26} />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
        Explore Services
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Service discovery is coming soon. LocalLink is getting the foundation
        ready to help you find the right professional for the job.
      </p>
      <Link
        to="/"
        className="mt-7 inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-800"
      >
        <ArrowLeft size={17} /> Back to home
      </Link>
    </section>
  );
}

export default ExploreServicesPage;
