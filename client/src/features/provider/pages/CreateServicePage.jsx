import { useNavigate } from 'react-router-dom';
import ServiceForm from '../components/ServiceForm.jsx';
import { createProviderService } from '../services/provider.service.js';

export default function CreateServicePage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl">
      <p className="font-semibold text-indigo-600">Service management</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Add Service</h1>
      <div className="mt-6">
        <ServiceForm submitLabel="Create service" onSubmit={async (payload) => {
          await createProviderService(payload);
          navigate('/provider/services');
        }} />
      </div>
    </div>
  );
}
