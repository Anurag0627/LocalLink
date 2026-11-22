import { ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import RatingDisplay from './RatingDisplay.jsx';

function priceLabel(service) {
  if (service.pricingType === 'QUOTE') return 'Get a quote';
  if (typeof service.price !== 'number') return 'Price unavailable';
  const prefix = service.pricingType === 'STARTING_FROM' ? 'Starting at ' : service.pricingType === 'HOURLY' ? '' : '';
  const suffix = service.pricingType === 'HOURLY' ? '/hour' : '';
  return `${prefix}$${service.price.toLocaleString()}${suffix}`;
}

const locationLabel = {
  AT_CUSTOMER_LOCATION: 'At your location',
  AT_PROVIDER_LOCATION: 'At provider location',
  REMOTE: 'Remote',
};

export default function ServiceCard({ service }) {
  const provider = service.provider;
  const providerId = provider?._id;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      {service.images?.[0] ? (
        <img src={service.images[0]} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
      ) : (
        <div className="mb-4 h-40 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50" />
      )}
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{service.category?.name || 'Service'}</span>
        <RatingDisplay rating={service.averageRating} count={service.totalReviews} compact />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{service.title}</h3>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{service.description}</p>
      <div className="mt-4 space-y-2 text-sm">
        {provider?.businessName && (
          providerId ? (
            <Link to={`/providers/${providerId}`} state={{ provider }} className="block font-semibold text-slate-700 hover:text-indigo-700">
              {provider.businessName}
            </Link>
          ) : <p className="font-semibold text-slate-700">{provider.businessName}</p>
        )}
        <p className="font-bold text-indigo-700">{priceLabel(service)}</p>
        {service.serviceLocationType && (
          <p className="inline-flex items-center gap-1 text-slate-500">
            <MapPin size={15} /> {locationLabel[service.serviceLocationType] || service.serviceLocationType}
          </p>
        )}
      </div>
      <Link
        to={`/services/${service._id}`}
        className="mt-5 inline-flex items-center gap-2 font-semibold text-indigo-700 hover:text-indigo-800"
      >
        View details <ArrowRight size={16} />
      </Link>
    </article>
  );
}
