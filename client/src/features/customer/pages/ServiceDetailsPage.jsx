import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getServiceById, getServiceReviews } from '../services/customer.service.js';
import { useAuth } from '../../auth/context/useAuth.js';
import RatingDisplay from '../components/RatingDisplay.jsx';
import ReviewList from '../../reviews/components/ReviewList.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews.jsx';

const locationLabel = {
  AT_CUSTOMER_LOCATION: 'At your location',
  AT_PROVIDER_LOCATION: 'At provider location',
  REMOTE: 'Remote',
};

export default function ServiceDetailsPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({});
  const [reviewsPage, setReviewsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getServiceById(serviceId),
      getServiceReviews(serviceId, { page: reviewsPage, limit: 5, sortBy: 'newest' }),
    ]).then(([serviceResponse, reviewResponse]) => {
      if (!active) return;
      setData(serviceResponse.data.data);
      setReviews(reviewResponse.data.data || []);
      setReviewsMeta(reviewResponse.data.meta || {});
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [serviceId, reviewsPage]);

  if (loading) return <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><LoadingState label="Loading service details..." /></div>;
  if (error) return <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><ErrorState error={error} /></div>;
  if (!data) return <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><EmptyState title="Service not found" /></div>;

  const { service, category, provider } = data;
  const price = service.pricingType === 'QUOTE'
    ? 'Get a quote'
    : typeof service.price === 'number'
      ? `${service.pricingType === 'STARTING_FROM' ? 'Starting at ' : ''}$${service.price.toLocaleString()}${service.pricingType === 'HOURLY' ? '/hour' : ''}`
      : 'Price unavailable';

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to results</button>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <main>
          {service.images?.[0] && <img src={service.images[0]} alt="" className="mb-6 h-72 w-full rounded-3xl object-cover" />}
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{category?.name || 'Service'}</span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">{service.title}</h1>
          <div className="mt-4"><RatingDisplay rating={service.averageRating} count={service.totalReviews} /></div>
          <p className="mt-6 whitespace-pre-line leading-7 text-slate-600">{service.description}</p>
          {service.availability?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">Availability</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {service.availability.map((day) => (
                  <div key={day.day} className="rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold text-slate-800">{day.day}</span>{day.slots?.length ? <span className="ml-2 text-slate-500">{day.slots.map((slot) => `${slot.start}-${slot.end}`).join(', ')}</span> : <span className="ml-2 text-slate-500">Not listed</span>}</div>
                ))}
              </div>
            </div>
          )}
        </main>
        <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-slate-500">Pricing</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{price}</p>
          {service.serviceLocationType && <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} /> {locationLabel[service.serviceLocationType] || service.serviceLocationType}</p>}
          <hr className="my-5 border-slate-100" />
          <p className="text-sm font-semibold text-slate-500">Provider</p>
          <p className="mt-1 font-bold text-slate-900">{provider.businessName || 'LocalLink provider'}</p>
          {provider.description && <p className="mt-2 text-sm leading-6 text-slate-600">{provider.description}</p>}
          {provider.serviceAreas?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Service areas</p>
              <p className="mt-1 text-sm text-slate-600">{provider.serviceAreas.map((area) => [area.city, area.state].filter(Boolean).join(', ')).filter(Boolean).join('; ')}</p>
            </div>
          )}
          {isAuthenticated && user?.role === 'CUSTOMER' ? (
            <button
              type="button"
              onClick={() => navigate(`/customer/services/${serviceId}/book`)}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Book service
            </button>
          ) : isAuthenticated ? (
            <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">Booking is available to customer accounts.</p>
          ) : (
            <Link
              to="/login"
              state={{ from: `/customer/services/${serviceId}/book` }}
              className="mt-5 block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Log in to book
            </Link>
          )}
        </aside>
      </div>
      <section className="mt-10 rounded-2xl border border-slate-100 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Published reviews</h2>
        <div className="mt-5"><ReviewList reviews={reviews} /></div>
        <div className="mt-5"><Pagination page={reviewsMeta.page || reviewsPage} totalPages={reviewsMeta.totalPages} onPageChange={setReviewsPage} /></div>
      </section>
    </section>
  );
}
