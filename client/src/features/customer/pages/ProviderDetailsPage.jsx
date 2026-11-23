import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  getProviderById,
  getProviderReviews,
  getProviderServices,
} from '../services/customer.service.js';
import RatingDisplay from '../components/RatingDisplay.jsx';
import ReviewList from '../../reviews/components/ReviewList.jsx';
import { ErrorState, LoadingState } from '../components/StateViews.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import Pagination from '../components/Pagination.jsx';

export default function ProviderDetailsPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationProvider = location.state?.provider;
  const [provider, setProvider] = useState(navigationProvider || null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewsMeta, setReviewsMeta] = useState({});
  const [reviewsPage, setReviewsPage] = useState(1);
  const [services, setServices] = useState([]);
  const [servicesMeta, setServicesMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);
  const [servicesPage, setServicesPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    getProviderById(providerId)
      .then((providerResponse) => {
        if (!active) return;
        setProvider(providerResponse.data.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [providerId, reload]);

  useEffect(() => {
    let active = true;
    const reviewsProviderId = provider?._id || providerId;
    getProviderReviews(reviewsProviderId, { page: reviewsPage, limit: 10, sortBy: 'newest' })
      .then((response) => {
        if (active) {
          setReviews(response.data.data || []);
          setReviewsMeta(response.data.meta || {});
        }
      })
      .catch((requestError) => {
        if (active) setReviewsError(requestError);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });
    return () => { active = false; };
  }, [providerId, provider?._id, reviewsPage]);

  useEffect(() => {
    let active = true;
    getProviderServices(providerId, {
      page: servicesPage,
      limit: 6,
      sortBy: 'newest',
    })
      .then((response) => {
        if (!active) return;
        setServices(response.data.data || []);
        setServicesMeta(response.data.meta || {});
      })
      .catch((requestError) => {
        if (active) setServicesError(requestError);
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });
    return () => { active = false; };
  }, [providerId, servicesPage]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back</button>
      {loading && <div className="mt-6"><LoadingState label="Loading provider profile..." /></div>}
      {!loading && error && (
        <div className="mt-6">
          <ErrorState
            error={error?.status === 404
              ? { message: 'This provider is unavailable or could not be found.' }
              : error}
            onRetry={() => setReload((value) => value + 1)}
          />
        </div>
      )}
      {!loading && !error && <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          {provider?.profileImage ? <img src={provider.profileImage} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-bold text-indigo-700">{provider?.businessName?.[0] || 'P'}</div>}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{provider?.businessName || 'Local service provider'}</h1>
            {provider && <div className="mt-2"><RatingDisplay rating={provider.averageRating} count={provider.totalReviews} /></div>}
            {provider?.description && <p className="mt-3 max-w-2xl text-slate-600">{provider.description}</p>}
            {provider?.serviceAreas?.length > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500"><MapPin size={16} /> {provider.serviceAreas.map((area) => [area.city, area.state].filter(Boolean).join(', ')).filter(Boolean).join('; ')}</p>
            )}
          </div>
        </div>
      </div>}
      {!loading && !error && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">Services offered</h2>
          <div className="mt-5">
            {servicesLoading && <LoadingState label="Loading provider services..." />}
            {!servicesLoading && servicesError && <ErrorState error={servicesError} />}
            {!servicesLoading && !servicesError && services.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">This provider has no publicly available services.</p>
            )}
            {!servicesLoading && !servicesError && services.length > 0 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  {services.map((service) => <ServiceCard key={service._id} service={service} />)}
                </div>
                <div className="mt-6">
                  <Pagination
                    page={Number(servicesMeta.page || servicesPage)}
                    totalPages={servicesMeta.totalPages}
                    onPageChange={setServicesPage}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      )}
      <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Published reviews</h2>
        <div className="mt-5">
          {reviewsLoading && <LoadingState label="Loading reviews..." />}
          {!reviewsLoading && reviewsError && <ErrorState error={reviewsError} />}
          {!reviewsLoading && !reviewsError && <ReviewList reviews={reviews} />}
          {!reviewsLoading && !reviewsError && (
            <div className="mt-5">
              <Pagination
                page={Number(reviewsMeta.page || reviewsPage)}
                totalPages={reviewsMeta.totalPages}
                onPageChange={setReviewsPage}
              />
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
