import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ServiceForm from '../components/ServiceForm.jsx';
import { getProviderServiceById, updateProviderService } from '../services/provider.service.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function EditServicePage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getProviderServiceById(serviceId).then((response) => {
      if (active) setService(response.data.data);
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [serviceId]);

  if (loading) return <LoadingState label="Loading service..." />;
  if (error) return <ErrorState error={error} />;
  if (!service) return <p className="text-slate-600">Service not found.</p>;

  return (
    <div className="max-w-4xl">
      <p className="font-semibold text-indigo-600">Service management</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Edit Service</h1>
      <div className="mt-6">
        <ServiceForm
          initialData={service}
          submitLabel="Save changes"
          onSubmit={async (payload) => {
            await updateProviderService(serviceId, payload);
            navigate('/provider/services');
          }}
        />
      </div>
    </div>
  );
}
