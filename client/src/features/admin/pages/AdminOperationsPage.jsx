import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import { LoadingState } from '../../customer/components/StateViews.jsx';
import { EmptyState, PageHeader, StatusBadge } from '../components/AdminTable.jsx';
import {
  createAdminCategory,
  getAdminBooking,
  getAdminBookings,
  getAdminCategories,
  getAdminReports,
  getAdminReviews,
  getAdminServices,
  moderateAdminReview,
  updateAdminCategory,
  updateAdminCategoryStatus,
  updateAdminServiceStatus,
} from '../services/admin.service.js';

export function AdminCategoriesPage() {
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({ page: 1, totalPages: 1 }); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' }); const [editing, setEditing] = useState(null);
  async function load(page = 1) { setLoading(true); setError(''); try { const result = await getAdminCategories({ page, limit: 20, search: search || undefined, includeServiceCount: 'true' }); setItems(result.items); setMeta(result.meta); } catch (caught) { setError(caught.message); } finally { setLoading(false); } }
  useEffect(() => {
    let active = true;
    getAdminCategories({ page: 1, limit: 20, includeServiceCount: 'true' })
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
  async function submit(event) { event.preventDefault(); try { if (editing) await updateAdminCategory(editing, form); else await createAdminCategory(form); setEditing(null); setForm({ name: '', description: '' }); await load(meta.page); } catch (caught) { setError(caught.message); } }
  async function toggle(item) { if (!window.confirm(`${item.isActive ? 'Deactivate' : 'Activate'} this category?`)) return; try { await updateAdminCategoryStatus(item._id, !item.isActive); await load(meta.page); } catch (caught) { setError(caught.message); } }
  return <div><PageHeader title="Category management" description="Create, edit and activate marketplace categories" />{error && <div className="mb-4"><Alert>{error}</Alert></div>}<form onSubmit={submit} className="mb-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_2fr_auto]"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Category name" className="rounded-lg border px-3 py-2 text-sm" /><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">{editing ? 'Update' : 'Create'}</button></form><form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 flex gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className="rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg border px-4 py-2 text-sm font-bold">Search</button></form>{loading ? <LoadingState /> : items.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Name</th><th>Status</th><th>Services</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-b"><td className="px-4 py-3 font-semibold">{item.name}</td><td><StatusBadge value={item.isActive ? 'ACTIVE' : 'INACTIVE'} /></td><td>{item.serviceCount ?? 0}</td><td className="px-4 py-3"><button onClick={() => { setEditing(item._id); setForm({ name: item.name, description: item.description || '' }); }} className="mr-2 rounded border px-2 py-1 text-xs">Edit</button><button onClick={() => toggle(item)} className="rounded border px-2 py-1 text-xs">{item.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <EmptyState />}</div>;
}

export function AdminServicesPage() {
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({ page: 1, totalPages: 1 }); const [search, setSearch] = useState(''); const [isActive, setIsActive] = useState(''); const [error, setError] = useState('');
  async function load(page = 1) { setError(''); try { const result = await getAdminServices({ page, limit: 20, search: search || undefined, isActive: isActive || undefined }); setItems(result.items); setMeta(result.meta); } catch (caught) { setError(caught.message); } }
  useEffect(() => {
    let active = true;
    getAdminServices({ page: 1, limit: 20 })
      .then((result) => {
        if (active) {
          setItems(result.items);
          setMeta(result.meta);
        }
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      });
    return () => { active = false; };
  }, []);
  async function toggle(item) { if (!window.confirm(`${item.isActive ? 'Deactivate' : 'Activate'} this service?`)) return; try { await updateAdminServiceStatus(item._id, !item.isActive); await load(meta.page); } catch (caught) { setError(caught.message); } }
  return <div><PageHeader title="Service oversight" description="Platform-wide services" />{error && <div className="mb-4"><Alert>{error}</Alert></div>}<form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" className="rounded-lg border px-3 py-2 text-sm" /><select value={isActive} onChange={(event) => setIsActive(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Search</button></form>{items.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="px-4 py-3">Service</th><th>Provider</th><th>Category</th><th>Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-b"><td className="px-4 py-3 font-semibold">{item.title}</td><td>{item.provider?.businessName || '—'}</td><td>{item.category?.name || '—'}</td><td><StatusBadge value={item.isActive ? 'ACTIVE' : 'INACTIVE'} /></td><td className="px-4 py-3"><button onClick={() => toggle(item)} className="rounded border px-2 py-1 text-xs">{item.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <EmptyState />}{meta.totalPages > 1 && <div className="mt-4 text-sm">Page {meta.page} of {meta.totalPages}</div>}</div>;
}

export function AdminBookingsPage() {
  const { bookingId } = useParams();
  if (bookingId) return <BookingDetails bookingId={bookingId} />;
  return <BookingList />;
}

function BookingList() {
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({ page: 1, totalPages: 1 }); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  async function load(page = 1) { const result = await getAdminBookings({ page, limit: 20, search: search || undefined, status: status || undefined }); setItems(result.items); setMeta(result.meta); }
  useEffect(() => {
    let active = true;
    getAdminBookings({ page: 1, limit: 20 })
      .then((result) => {
        if (active) {
          setItems(result.items);
          setMeta(result.meta);
        }
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      });
    return () => { active = false; };
  }, []);
  return <div><PageHeader title="Booking oversight" description="Read-only platform booking view" />{error && <div className="mb-4"><Alert>{error}</Alert></div>}<form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Booking number" className="rounded-lg border px-3 py-2 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option>{['PENDING','ACCEPTED','REJECTED','CANCELLED','COMPLETED'].map((value) => <option key={value}>{value}</option>)}</select><button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Search</button></form>{items.length ? <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="px-4 py-3">Booking</th><th>Customer</th><th>Provider</th><th>Status</th><th>Date</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-b"><td className="px-4 py-3"><Link to={`/admin/bookings/${item._id}`} className="font-semibold text-indigo-700">{item.bookingNumber}</Link></td><td>{item.customer?.firstName} {item.customer?.lastName}</td><td>{item.provider?.businessName}</td><td><StatusBadge value={item.status} /></td><td>{new Date(item.scheduledDate).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState />}</div>;
}

function BookingDetails({ bookingId }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getAdminBooking(bookingId).then(setData).catch((caught) => setError(caught.message)); }, [bookingId]);
  if (error) return <Alert>{error}</Alert>; if (!data) return <LoadingState />;
  return <div><PageHeader title={data.bookingNumber} description="Booking detail" /><div className="grid gap-4 rounded-2xl border bg-white p-5 text-sm sm:grid-cols-2"><p><strong>Customer:</strong> {data.customer?.firstName} {data.customer?.lastName}</p><p><strong>Provider:</strong> {data.provider?.businessName}</p><p><strong>Service:</strong> {data.service?.title}</p><p><strong>Status:</strong> <StatusBadge value={data.status} /></p><p><strong>Scheduled:</strong> {new Date(data.scheduledDate).toLocaleString()}</p><p><strong>Time:</strong> {data.scheduledTime}</p><p><strong>Created:</strong> {new Date(data.createdAt).toLocaleString()}</p></div></div>;
}

export function AdminReviewsPage() {
  const [items, setItems] = useState([]); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  async function load() { try { const result = await getAdminReviews({ page: 1, limit: 50, status: status || undefined }); setItems(result.items); } catch (caught) { setError(caught.message); } }
  useEffect(() => {
    let active = true;
    getAdminReviews({ page: 1, limit: 50 })
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch((caught) => {
        if (active) setError(caught.message);
      });
    return () => { active = false; };
  }, []);
  async function moderate(review, nextStatus) { const reason = window.prompt(nextStatus === 'HIDDEN' ? 'Moderation reason' : 'Restore reason', ''); if (!reason) return; try { await moderateAdminReview(review._id, { status: nextStatus, reason }); await load(); } catch (caught) { setError(caught.message); } }
  return <div><PageHeader title="Review moderation" description="Hide or restore published reviews" />{error && <Alert>{error}</Alert>}<select value={status} onChange={(event) => { setStatus(event.target.value); }} className="mb-4 rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option><option>PUBLISHED</option><option>HIDDEN</option></select><button onClick={load} className="ml-2 rounded-lg border px-3 py-2 text-sm">Apply</button>{items.length ? <div className="space-y-3">{items.map((review) => <article key={review._id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><strong>{review.rating}/5</strong> <StatusBadge value={review.status} />{review.reportCount > 0 && <span className="ml-2 text-xs text-red-700">{review.reportCount} report(s)</span>}</div><button onClick={() => moderate(review, review.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN')} className="rounded border px-3 py-2 text-xs font-bold">{review.status === 'HIDDEN' ? 'Restore' : 'Hide'}</button></div><p className="mt-3 text-sm text-slate-700">{review.comment || 'No comment.'}</p></article>)}</div> : <EmptyState />}</div>;
}

export function AdminReportsPage() {
  const [items, setItems] = useState([]); const [error, setError] = useState('');
  useEffect(() => { getAdminReports({ page: 1, limit: 50 }).then((result) => setItems(result.items)).catch((caught) => setError(caught.message)); }, []);
  return <div><PageHeader title="Review reports" description="Reported content and report reasons" />{error && <Alert>{error}</Alert>}{items.length ? <div className="space-y-3">{items.map((report) => <article key={report._id} className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><StatusBadge value={report.reason} /><span className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</span></div><p className="mt-3 text-sm text-slate-700">{report.description || 'No additional details.'}</p><p className="mt-2 text-xs text-slate-500">Review: {report.review?.comment || 'No comment'} ({report.review?.status})</p></article>)}</div> : <EmptyState message="No review reports." />}</div>;
}
