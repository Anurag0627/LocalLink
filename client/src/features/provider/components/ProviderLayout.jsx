import { useState } from 'react';
import {
  LayoutDashboard,
  Menu,
  UserRound,
  BriefcaseBusiness,
  Plus,
  Clock3,
  MapPin,
  CalendarCheck,
  CalendarRange,
  MessageSquareText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/context/useAuth.js';
import NotificationBell from '../../notifications/components/NotificationBell.jsx';

const navigation = [
  { to: '/provider', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/provider/profile', label: 'My Profile', icon: UserRound },
  { to: '/provider/services', label: 'My Services', icon: BriefcaseBusiness },
  { to: '/provider/services/new', label: 'Add Service', icon: Plus },
  { to: '/provider/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/provider/schedule', label: 'Schedule', icon: CalendarRange },
  { to: '/provider/reviews', label: 'Reviews', icon: MessageSquareText },
  { to: '/provider/availability', label: 'Availability', icon: Clock3 },
  { to: '/provider/service-areas', label: 'Service Areas', icon: MapPin },
];

export default function ProviderLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link to="/provider" className="px-2 text-xl font-extrabold text-slate-900">
          Local<span className="text-indigo-600">Link</span>
        </Link>
        <nav aria-label="Provider navigation" className="mt-8 space-y-1">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 border-t border-slate-100 pt-5">
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">Account</p>
          <NavLink to="/notifications/preferences" className={navClass}>
            <Settings size={18} /> Notification settings
          </NavLink>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} aria-label="Open provider navigation" className="rounded-lg border border-slate-200 p-2 lg:hidden">
              <Menu size={20} />
            </button>
            <p className="font-bold text-slate-900 lg:ml-0">{user?.firstName ? `${user.firstName}’s workspace` : 'Provider workspace'}</p>
          </div>
          <NotificationBell />
        </header>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Provider navigation">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/30" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-72 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Link to="/provider" className="text-xl font-extrabold">Local<span className="text-indigo-600">Link</span></Link>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2"><X size={20} /></button>
              </div>
              <nav className="mt-8 space-y-1">
                {navigation.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={navClass}>
                    <Icon size={18} /> {label}
                  </NavLink>
                ))}
              </nav>
              <button type="button" onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600">
                <LogOut size={18} /> Logout
              </button>
            </aside>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
