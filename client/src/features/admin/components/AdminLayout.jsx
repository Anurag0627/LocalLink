import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/context/useAuth.js';

const links = [
  ['Dashboard', '/admin'],
  ['Customers', '/admin/customers'],
  ['Providers', '/admin/providers'],
  ['Verification', '/admin/providers/verification'],
  ['Categories', '/admin/categories'],
  ['Services', '/admin/services'],
  ['Bookings', '/admin/bookings'],
  ['Reviews', '/admin/reviews'],
  ['Reports', '/admin/reports'],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <Link to="/admin" className="text-xl font-extrabold text-slate-900">Local<span className="text-indigo-600">Link</span></Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-600 sm:block">{user?.firstName} (Admin)</span>
          <button type="button" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Logout</button>
        </div>
      </header>
      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
        <nav aria-label="Admin navigation" className="space-y-1">
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <nav aria-label="Mobile admin navigation" className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-slate-200 bg-white px-2 py-2 md:hidden">
        {links.map(([label, to]) => (
          <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `mx-1 min-w-max rounded-lg px-3 py-2 text-xs font-bold ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>{label}</NavLink>
        ))}
      </nav>
      <main className="pb-16 pt-16 md:ml-64 md:pb-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
