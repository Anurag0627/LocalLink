import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { getCategories, getServices } from '../services/customer.service.js';
import ServiceCard from '../components/ServiceCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';

const defaultFilters = {
  search: '',
  category: '',
  city: '',
  state: '',
  postalCode: '',
  pricingType: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'newest',
};

export default function ServiceDiscoveryPage({ fixedCategory }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...defaultFilters,
    ...Object.fromEntries([...searchParams]),
    ...(fixedCategory ? { category: fixedCategory } : {}),
  }));
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    getCategories({ limit: 100, includeServiceCount: 'true' })
      .then((response) => active && setCategories(response.data.data || []))
      .catch(() => active && setCategories([]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = {
      page: filters.page || 1,
      limit: 12,
      sortBy: filters.sortBy || 'newest',
    };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && !['page'].includes(key)) params[key] = value;
    });
    getServices(params)
      .then((response) => {
        if (!controller.signal.aborted) setResult({ items: response.data.data || [], meta: response.data.meta || {} });
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, fixedCategory, reload]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  const resetFilters = () => setFilters({ ...defaultFilters, page: 1 });

  const meta = result.meta;
  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === fixedCategory || category._id === fixedCategory),
    [categories, fixedCategory],
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8">
        <p className="font-semibold text-indigo-600">{activeCategory ? 'Category services' : 'Find local help'}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {activeCategory?.name || 'Explore services'}
        </h1>
        {activeCategory?.description && <p className="mt-3 max-w-2xl text-slate-600">{activeCategory.description}</p>}
      </div>

      <form
        className="mb-8 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4">
          <Search size={18} className="text-indigo-600" />
          <span className="sr-only">Search services</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Search services"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <span className="sr-only">Sort services</span>
          <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)} className="w-full bg-white py-3 text-sm outline-none">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
            <option value="rating">Highest rated</option>
            <option value="popular">Most popular</option>
          </select>
        </label>
      </form>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 lg:sticky lg:top-24" aria-label="Service filters">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Filters</h2>
            <button type="button" onClick={resetFilters} className="text-sm font-semibold text-indigo-700">Reset</button>
          </div>
          {!fixedCategory && (
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Category
              <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500">
                <option value="">All categories</option>
                {categories.map((category) => <option key={category._id} value={category.slug || category._id}>{category.name}</option>)}
              </select>
            </label>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">City
              <input value={filters.city} onChange={(event) => updateFilter('city', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none" />
            </label>
            <label className="text-sm font-semibold text-slate-700">State
              <input value={filters.state} onChange={(event) => updateFilter('state', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none" />
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Postal code
            <input value={filters.postalCode} onChange={(event) => updateFilter('postalCode', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none" />
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Pricing
            <select value={filters.pricingType} onChange={(event) => updateFilter('pricingType', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none">
              <option value="">Any pricing</option>
              <option value="FIXED">Fixed</option>
              <option value="HOURLY">Hourly</option>
              <option value="STARTING_FROM">Starting from</option>
              <option value="QUOTE">Quote</option>
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">Min price
              <input type="number" min="0" value={filters.minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Max price
              <input type="number" min="0" value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none" />
            </label>
          </div>
        </aside>

        <div>
          {loading && <LoadingState label="Finding services..." />}
          {!loading && error && <ErrorState error={error} onRetry={() => setReload((value) => value + 1)} />}
          {!loading && !error && result.items.length === 0 && <EmptyState title="No services match" description="Try removing a filter or searching with another keyword." />}
          {!loading && !error && result.items.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((service) => <ServiceCard key={service._id} service={service} />)}
              </div>
              <div className="mt-8">
                <Pagination
                  page={Number(meta.page || filters.page || 1)}
                  totalPages={meta.totalPages}
                  onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
