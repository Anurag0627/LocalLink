import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  activateProviderService,
  deactivateProviderService,
  deleteProviderService,
  getProviderServices,
  getProviderProfile,
} from '../services/provider.service.js';
import Pagination from '../../customer/components/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

export default function ProviderServicesPage() {
  const [services, setServices] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [mutating, setMutating] = useState('');

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const [servicesResponse, profileResponse] = await Promise.all([
        getProviderServices({ page: targetPage, limit: 12 }),
        getProviderProfile(),
      ]);
      setServices(servicesResponse.data.data || []);
      setMeta(servicesResponse.data.meta || {});
      setVerificationStatus(profileResponse.data.data.profile?.verificationStatus || '');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getProviderServices({ page, limit: 12 }),
      getProviderProfile(),
    ]).then(([servicesResponse, profileResponse]) => {
      if (!active) return;
      setServices(servicesResponse.data.data || []);
      setMeta(servicesResponse.data.meta || {});
      setVerificationStatus(profileResponse.data.data.profile?.verificationStatus || '');
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page]);

  const mutate = async (key, action) => {
    setMutating(key);
    setError(null);
    try {
      await action();
      await load(page);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div><p className="font-semibold text-indigo-600">Service management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">My Services</h1></div>
        {verificationStatus === 'VERIFIED' ? (
          <Link to="/provider/services/new" className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white">Add service</Link>
        ) : (
          <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">Verification required</span>
        )}
      </div>
      {verificationStatus !== 'VERIFIED' && verificationStatus && (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Only verified providers can create or activate services. This restriction is enforced by the backend.</p>
      )}
      {error && <div className="mt-5"><ErrorState error={error} /></div>}
      {loading && <div className="mt-6"><LoadingState label="Loading services..." /></div>}
      {!loading && !error && services.length === 0 && <div className="mt-6"><EmptyState title="No services yet" description="Add a service to make it available for customers." /></div>}
      {!loading && !error && services.length > 0 && (
        <>
          <div className="mt-6 space-y-4">
            {services.map((service) => (
              <article key={service._id} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-bold text-slate-900">{service.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{service.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{service.description}</p>
                    <p className="mt-3 text-sm text-slate-500">{service.category?.name || 'Category'} · {service.pricingType}{typeof service.price === 'number' ? ` · $${service.price}` : ' · Quote'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <Link to={`/provider/services/${service._id}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Edit</Link>
                    {verificationStatus === 'VERIFIED' && (
                      service.isActive ? (
                        <button type="button" disabled={Boolean(mutating)} onClick={() => mutate(`deactivate-${service._id}`, () => deactivateProviderService(service._id))} className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700">Deactivate</button>
                      ) : (
                        <button type="button" disabled={Boolean(mutating)} onClick={() => mutate(`activate-${service._id}`, () => activateProviderService(service._id))} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">Activate</button>
                      )
                    )}
                    <button type="button" disabled={Boolean(mutating)} onClick={() => {
                      if (window.confirm('Deactivate this service? It will no longer be publicly available.')) {
                        mutate(`delete-${service._id}`, () => deleteProviderService(service._id));
                      }
                    }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6"><Pagination page={meta.page || page} totalPages={meta.totalPages} onPageChange={setPage} /></div>
        </>
      )}
    </div>
  );
}
