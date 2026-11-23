import { ArrowLeft, BriefcaseBusiness, CheckCircle2, UserRoundPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/useAuth.js';
import { roleLandingPath } from '../utils/roleLanding.js';

function BecomeProviderPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 sm:py-20">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <UserRoundPlus size={30} />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Become a LocalLink Provider
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
        Join our growing marketplace of skilled local professionals. List your services, receive appointment requests, build your reputation with customer reviews, and manage your schedule effortlessly.
      </p>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <BriefcaseBusiness size={20} className="text-indigo-600" />
          <h3 className="mt-3 font-bold text-slate-900">Showcase Services</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Create service listings with custom pricing, service areas, and availability schedules.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <CheckCircle2 size={20} className="text-indigo-600" />
          <h3 className="mt-3 font-bold text-slate-900">Manage Bookings</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Review incoming customer requests, accept or decline, and keep track of your schedule.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <UserRoundPlus size={20} className="text-indigo-600" />
          <h3 className="mt-3 font-bold text-slate-900">Verified Profile</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Get verified to build customer trust and receive verified reviews.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {isAuthenticated && user?.role === 'PROVIDER' ? (
          <Link
            to={roleLandingPath('PROVIDER')}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-700"
          >
            Go to Provider Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/register/provider"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-700"
            >
              Register as a Provider
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </section>
  );
}

export default BecomeProviderPage;
