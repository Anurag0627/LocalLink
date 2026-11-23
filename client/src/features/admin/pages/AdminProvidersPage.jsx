import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import { LoadingState } from '../../customer/components/StateViews.jsx';
import { EmptyState, PageHeader, StatusBadge } from '../components/AdminTable.jsx';
import { getAdminProvider, getAdminProviders, updateAdminProviderStatus, updateProviderVerification } from '../services/admin.service.js';

export default function AdminProvidersPage({ verificationOnly = false }) {
  const { providerId } = useParams();
  if (providerId) return <ProviderDetails providerId={providerId} />;
  return <ProviderList verificationOnly={verificationOnly} />;
}

function ProviderList({ verificationOnly = false }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(verificationOnly ? 'PENDING' : '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(page = 1) {
    setLoading(true); setError('');
    try {
      const result = await getAdminProviders({ page, limit: 20, search: search || undefined, verificationStatus: verificationStatus || undefined });
      setItems(result.items); setMeta(result.meta);
    } catch (caught) { setError(caught.message); } finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    getAdminProviders({
      page: 1,
      limit: 20,
      verificationStatus: verificationOnly ? 'PENDING' : undefined,
    })
      .then((result) => {
        if (active) {
          setItems(result.items);
          setMeta(result.meta);
          setLoading(false);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [verificationOnly]);
  async function verify(id, status) {
    let reason;
    if (status === 'REJECTED') {
      reason = window.prompt('Rejection reason');
      if (!reason) return;
    }
    if (!window.confirm(`${status === 'VERIFIED' ? 'Approve' : 'Reject'} this provider?`)) return;
    try { await updateProviderVerification(id, { verificationStatus: status, reason }); await load(meta.page); } catch (caught) { setError(caught.message); }
  }
  async function changeStatus(id, status) {
    if (!window.confirm(`Change provider account to ${status}?`)) return;
    try { await updateAdminProviderStatus(id, status); await load(meta.page); } catch (caught) { setError(caught.message); }
  }
  return (
    <div>
      <PageHeader title={verificationOnly ? 'Provider verification queue' : 'Provider management'} description={verificationOnly ? 'Approve or reject provider applications' : 'Provider profiles and accounts'} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 flex flex-wrap gap-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Business name or account email" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All verification statuses</option><option>PENDING</option><option>VERIFIED</option><option>REJECTED</option></select>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Search</button>
      </form>
      {loading ? <LoadingState /> : items.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Business</th><th>Account</th><th>Verification</th><th>Rating</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold"><Link to={`/admin/providers/${item._id}`} className="text-indigo-700">{item.businessName}</Link></td><td>{item.user?.email || '—'}</td><td><StatusBadge value={item.verificationStatus} /></td><td>{item.averageRating?.toFixed?.(1) ?? item.averageRating}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{item.verificationStatus !== 'VERIFIED' && <button onClick={() => verify(item._id, 'VERIFIED')} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Approve</button>}{item.verificationStatus !== 'REJECTED' && <button onClick={() => verify(item._id, 'REJECTED')} className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">Reject</button>}<select aria-label="Provider account status" value={item.user?.status || 'ACTIVE'} onChange={(event) => changeStatus(item._id, event.target.value)} className="rounded border px-1 py-1 text-xs"><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select></div></td></tr>)}</tbody></table></div> : <EmptyState />}
      {meta.totalPages > 1 && <div className="mt-4 flex gap-2">{meta.page > 1 && <button onClick={() => load(meta.page - 1)} className="rounded border px-3 py-2 text-sm">Previous</button>}<span className="px-3 py-2 text-sm">Page {meta.page} of {meta.totalPages}</span>{meta.page < meta.totalPages && <button onClick={() => load(meta.page + 1)} className="rounded border px-3 py-2 text-sm">Next</button>}</div>}
    </div>
  );
}

function ProviderDetails({ providerId }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getAdminProvider(providerId).then(setData).catch((caught) => setError(caught.message)); }, [providerId]);
  if (error) return <Alert>{error}</Alert>; if (!data) return <LoadingState />;
  const { profile, services, bookingStats, recentBookings } = data;
  return <div><PageHeader title={profile.businessName} description="Provider details" /><div className="grid gap-6 lg:grid-cols-3"><section className="rounded-2xl border bg-white p-5 lg:col-span-2"><h2 className="font-bold">Business profile</h2><p className="mt-3 text-sm text-slate-600">{profile.description || 'No description.'}</p><div className="mt-4 flex flex-wrap gap-3"><StatusBadge value={profile.verificationStatus} /><StatusBadge value={profile.user?.status} /></div><p className="mt-4 text-sm"><strong>Rating:</strong> {profile.averageRating} ({profile.totalReviews} reviews)</p></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Booking totals</h2>{Object.entries(bookingStats).map(([status, count]) => <p key={status} className="mt-2 text-sm"><StatusBadge value={status} /> <strong className="ml-2">{count}</strong></p>)}</section></div><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Services ({services.length})</h2>{services.length ? services.map((service) => <div key={service._id} className="mt-3 flex justify-between border-t pt-3 text-sm"><span>{service.title}</span><StatusBadge value={service.isActive ? 'ACTIVE' : 'INACTIVE'} /></div>) : <p className="mt-3 text-sm text-slate-500">No services.</p>}</section><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Recent bookings</h2>{recentBookings.length ? recentBookings.map((booking) => <div key={booking._id} className="mt-3 border-t pt-3 text-sm"><StatusBadge value={booking.status} /> <span className="ml-2">{booking.bookingNumber}</span></div>) : <p className="mt-3 text-sm text-slate-500">No bookings.</p>}</section></div>;
}
