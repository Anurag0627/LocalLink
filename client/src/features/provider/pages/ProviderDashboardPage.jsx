import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Clock3, MapPin, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getProviderProfile,
  getProviderServices,
} from '../services/provider.service.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function ProviderDashboardPage() {
  const [profileData, setProfileData] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesMeta, setServicesMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProviderProfile(),
      getProviderServices({ page: 1, limit: 100 }),
    ]).then(([profileResponse, servicesResponse]) => {
      if (!active) return;
      setProfileData(profileResponse.data.data);
      setServices(servicesResponse.data.data || []);
      setServicesMeta(servicesResponse.data.meta || {});
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Loading provider dashboard..." />;
  if (error) return <ErrorState error={error} />;

  const profile = profileData?.profile;
  const user = profileData?.user;
  const activeCount = services.filter((service) => service.isActive).length;
  const inactiveCount = services.filter((service) => !service.isActive).length;
  const knownProfileFields = [profile?.businessName, profile?.description, profile?.experienceYears !== undefined, profile?.profileImage].filter(Boolean).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-indigo-600">Provider workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{profile?.businessName || `${user?.firstName || 'Provider'}'s business`}</h1>
        </div>
        <Link to="/provider/services/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"><Plus size={18} /> Add service</Link>
      </div>

      {profile?.verificationStatus !== 'VERIFIED' && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="font-bold">{profile?.verificationStatus === 'PENDING' ? 'Verification pending' : 'Verification not completed'}</p>
          <p className="mt-1 text-sm">Only verified providers can publish or activate services. Existing backend restrictions remain authoritative.</p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Verification', profile?.verificationStatus || 'Unknown', ShieldCheck],
          ['Total services', servicesMeta.total ?? services.length, BriefcaseBusiness],
          ['Active services', activeCount, Clock3],
          ['Inactive services', inactiveCount, BriefcaseBusiness],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <Icon size={20} className="text-indigo-600" />
            <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="font-bold text-slate-900">Business profile</h2>
          <p className="mt-2 text-sm text-slate-600">{profile?.description || 'No business description has been added.'}</p>
          <div className="mt-5">
            <div className="flex justify-between text-sm"><span className="font-semibold text-slate-700">Profile information</span><span className="text-slate-500">{knownProfileFields}/4 fields</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${knownProfileFields * 25}%` }} /></div>
          </div>
          {typeof profile?.averageRating === 'number' && (
            <p className="mt-5 text-sm text-slate-600">Rating: <strong className="text-slate-900">{profile.averageRating.toFixed(1)}</strong> ({profile.totalReviews || 0} published reviews)</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="font-bold text-slate-900">Quick actions</h2>
          <div className="mt-4 space-y-2">
            <Link to="/provider/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserRound size={18} /> Edit profile</Link>
            <Link to="/provider/services" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><BriefcaseBusiness size={18} /> Manage services</Link>
            <Link to="/provider/availability" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Clock3 size={18} /> Update availability</Link>
            <Link to="/provider/service-areas" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MapPin size={18} /> Manage service areas</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
