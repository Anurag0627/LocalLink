import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../../components/common/Alert.jsx';
import { LoadingState } from '../../customer/components/StateViews.jsx';
import { getAdminDashboard } from '../services/admin.service.js';
import { PageHeader } from '../components/AdminTable.jsx';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getAdminDashboard().then(setData).catch((caught) => setError(caught.message));
  }, []);
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <LoadingState label="Loading dashboard..." />;
  const cards = [
    ['Customers', data.statistics.totalCustomers, '/admin/customers'],
    ['Providers', data.statistics.totalProviders, '/admin/providers'],
    ['Verified providers', data.statistics.verifiedProviders, '/admin/providers'],
    ['Pending verifications', data.statistics.pendingProviderVerifications, '/admin/providers/verification'],
    ['Active services', data.statistics.totalActiveServices, '/admin/services'],
    ['Bookings', data.statistics.totalBookings, '/admin/bookings'],
    ['Completed bookings', data.statistics.completedBookings, '/admin/bookings'],
    ['Published reviews', data.statistics.publishedReviews, '/admin/reviews'],
  ];
  return (
    <div>
      <PageHeader title="Platform dashboard" description="Live marketplace overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, to]) => (
          <Link key={label} to={to} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{value ?? 0}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Recent title="Recent registrations" rows={data.recent.customers} fields={(row) => `${row.firstName} ${row.lastName}`} />
        <Recent title="Recent bookings" rows={data.recent.bookings} fields={(row) => `${row.bookingNumber} — ${row.status}`} />
        <Recent title="Recent provider applications" rows={data.recent.providers} fields={(row) => `${row.user?.firstName || ''} ${row.user?.lastName || ''} — ${row.businessName}`} />
        <Recent title="Reported reviews" rows={data.recent.reportedReviews} fields={(row) => `${row.rating}/5 — ${row.reportCount} report(s)`} />
      </div>
    </div>
  );
}

function Recent({ title, rows = [], fields }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      {rows.length ? <ul className="divide-y divide-slate-100">{rows.map((row) => <li key={row._id} className="py-3 text-sm text-slate-700">{fields(row)}</li>)}</ul> : <p className="text-sm text-slate-500">No recent records.</p>}
    </section>
  );
}
