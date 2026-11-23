import { useEffect, useState } from 'react';
import { ArrowRight, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/useAuth.js';
import { getCategories, getServices } from '../services/customer.service.js';
import CategoryCard from '../components/CategoryCard.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getCategories({ limit: 6, sortBy: 'displayOrder', includeServiceCount: 'true' }),
      getServices({ limit: 6, sortBy: 'rating', order: 'desc' }),
    ]).then(([categoryResponse, serviceResponse]) => {
      if (!active) return;
      setCategories(categoryResponse.data.data || []);
      setServices(serviceResponse.data.data || []);
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const exploreServicesPath = isAuthenticated && user?.role === 'CUSTOMER' ? '/customer/services' : '/services';

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    navigate(`${exploreServicesPath}${params.size ? `?${params}` : ''}`);
  };

  return (
    <>
      <section className="overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
              <Sparkles size={16} /> Local help, right around the corner
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">Find Trusted Local Professionals Near You</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Discover skilled professionals for everyday services, compare options, and connect with the right provider.</p>
            <form role="search" onSubmit={submitSearch} className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg sm:flex-row">
              <label className="flex flex-1 items-center gap-3 px-3">
                <Search size={20} className="text-indigo-600" />
                <span className="sr-only">Search services</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What service do you need?" className="min-w-0 flex-1 py-2 text-sm outline-none" />
              </label>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">Find a pro <ArrowRight size={17} /></button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div><p className="font-semibold text-indigo-600">What can we help with?</p><h2 className="mt-2 text-3xl font-bold text-slate-900">Popular categories</h2></div>
          <Link to={exploreServicesPath} className="hidden items-center gap-2 font-semibold text-indigo-700 sm:inline-flex">Explore services <ArrowRight size={17} /></Link>
        </div>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {!loading && error && <div className="mt-8"><ErrorState error={error} /></div>}
        {!loading && !error && categories.length === 0 && <div className="mt-8"><EmptyState title="Categories are not available yet" /></div>}
        {!loading && categories.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => <CategoryCard key={category._id} category={category} />)}
          </div>
        )}
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <p className="font-semibold text-indigo-600">Browse what's available</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Featured services</h2>
          {loading && <div className="mt-8"><LoadingState /></div>}
          {!loading && error && <div className="mt-8"><ErrorState error={error} /></div>}
          {!loading && !error && services.length === 0 && <div className="mt-8"><EmptyState title="No services available yet" /></div>}
          {!loading && services.length > 0 && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => <ServiceCard key={service._id} service={service} />)}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm md:grid-cols-3">
          {[
            ['1', 'Tell us what you need', 'Search by service, category, or location.'],
            ['2', 'Compare local options', 'Review public provider and service information.'],
            ['3', 'Choose with confidence', 'Use ratings and details to find the right fit.'],
          ].map(([number, title, description]) => (
            <article key={number}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{number}</span><h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><ShieldCheck className="shrink-0" /><p className="text-sm leading-6"><strong>Browse publicly available information.</strong> LocalLink displays service areas and published reviews only where the backend provides them. Booking and private contact details are not included in this phase.</p></div>
      </section>
    </>
  );
}
