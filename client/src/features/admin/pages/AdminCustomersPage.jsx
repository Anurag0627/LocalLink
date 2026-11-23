import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import { LoadingState } from '../../customer/components/StateViews.jsx';
import { EmptyState, PageHeader, StatusBadge } from '../components/AdminTable.jsx';
import { getAdminCustomer, getAdminCustomers, updateAdminCustomerStatus } from '../services/admin.service.js';

export default function AdminCustomersPage() {
  const { customerId } = useParams();
  if (customerId) return <CustomerDetails customerId={customerId} />;
  return <CustomerList />;
}

function CustomerList() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(page = 1) {
    setLoading(true); setError('');
    try {
      const result = await getAdminCustomers({ page, limit: 20, search: search || undefined, status: status || undefined });
      setItems(result.items); setMeta(result.meta);
    } catch (caught) { setError(caught.message); } finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    getAdminCustomers({ page: 1, limit: 20 })
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
  }, []);
  async function changeStatus(id, next) {
    if (!window.confirm(`Change customer account to ${next}?`)) return;
    try { await updateAdminCustomerStatus(id, next); await load(meta.page); } catch (caught) { setError(caught.message); }
  }
  return (
    <div>
      <PageHeader title="Customer management" description="Accounts and customer activity" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 flex flex-wrap gap-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Search</button>
      </form>
      {loading ? <LoadingState /> : items.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Customer</th><th>Email</th><th>Status</th><th>Registered</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item._id} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold"><Link className="text-indigo-700" to={`/admin/customers/${item._id}`}>{item.firstName} {item.lastName}</Link></td><td>{item.email}</td><td><StatusBadge value={item.status} /></td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><select aria-label={`Status for ${item.email}`} value={item.status} onChange={(event) => changeStatus(item._id, event.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs"><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select></td></tr>)}</tbody>
          </table>
        </div>
      ) : <EmptyState />}
      {meta.totalPages > 1 && <div className="mt-4 flex gap-2">{meta.page > 1 && <button onClick={() => load(meta.page - 1)} className="rounded border px-3 py-2 text-sm">Previous</button>}<span className="px-3 py-2 text-sm">Page {meta.page} of {meta.totalPages}</span>{meta.page < meta.totalPages && <button onClick={() => load(meta.page + 1)} className="rounded border px-3 py-2 text-sm">Next</button>}</div>}
    </div>
  );
}

function CustomerDetails({ customerId }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getAdminCustomer(customerId).then(setData).catch((caught) => setError(caught.message)); }, [customerId]);
  if (error) return <Alert>{error}</Alert>; if (!data) return <LoadingState />;
  return <div><PageHeader title={`${data.account.firstName} ${data.account.lastName}`} description="Customer details" /><div className="grid gap-6 lg:grid-cols-3"><section className="rounded-2xl border bg-white p-5 lg:col-span-2"><h2 className="font-bold">Account</h2><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><dt>Email</dt><dd>{data.account.email}</dd><dt>Status</dt><dd><StatusBadge value={data.account.status} /></dd><dt>Registered</dt><dd>{new Date(data.account.createdAt).toLocaleString()}</dd><dt>Phone</dt><dd>{data.account.phone || 'Not provided'}</dd></dl></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Profile</h2><p className="mt-3 text-sm text-slate-500">{data.profile?.addresses?.length || 0} saved address(es)</p></section></div><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Booking history</h2>{data.bookings.length ? data.bookings.map((booking) => <div key={booking._id} className="mt-3 border-t pt-3 text-sm"><StatusBadge value={booking.status} /> <span className="ml-2">{booking.bookingNumber}</span></div>) : <p className="mt-3 text-sm text-slate-500">No bookings.</p>}</section></div>;
}
