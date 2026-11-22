import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/context/useAuth.js';
import NotificationBell from '../features/notifications/components/NotificationBell.jsx';

export default function RoleLayout({ role, title }) {
  const { user, logout } = useAuth();
  const base = `/${role.toLowerCase()}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="text-xl font-extrabold text-slate-900">
            Local<span className="text-indigo-600">Link</span>
          </Link>
          <nav aria-label={`${title} navigation`} className="flex items-center gap-4">
            {role === 'CUSTOMER' ? (
              <>
                <NavLink to="/customer" end className={({ isActive }) => `text-sm font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>Home</NavLink>
                <NavLink to="/customer/services" className={({ isActive }) => `hidden text-sm font-semibold sm:block ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>Explore</NavLink>
                <NavLink to="/customer/bookings" className={({ isActive }) => `hidden text-sm font-semibold sm:block ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>My Bookings</NavLink>
                <NavLink to="/customer/reviews" className={({ isActive }) => `hidden text-sm font-semibold sm:block ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>My Reviews</NavLink>
              </>
            ) : (
              <NavLink to={base} className="text-sm font-semibold text-slate-600">{title}</NavLink>
            )}
            <NotificationBell />
            {role === 'CUSTOMER' && (
              <NavLink to="/notifications/preferences" className="hidden text-sm font-semibold text-slate-600 sm:block">Preferences</NavLink>
            )}
            <span className="text-sm text-slate-500">{user?.firstName}</span>
            <button type="button" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
