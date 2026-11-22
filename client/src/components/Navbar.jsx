import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/context/useAuth.js';
import { roleLandingPath } from '../utils/roleLanding.js';

const navLinkClass = ({ isActive }) =>
  `transition-colors hover:text-indigo-700 ${
    isActive ? 'font-semibold text-indigo-700' : 'text-slate-600'
  }`;

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"
      >
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">
            L
          </span>
          Local<span className="-ml-2 text-indigo-600">Link</span>
        </Link>

        <button
          type="button"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div
          id="primary-navigation"
          className={`${isMenuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full flex-col gap-5 border-b border-slate-100 bg-white px-5 py-5 shadow-sm md:static md:flex md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <NavLink to="/" end onClick={closeMenu} className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to={isAuthenticated && user?.role === 'CUSTOMER' ? '/customer/services' : '/services'} onClick={closeMenu} className={navLinkClass}>
            Explore Services
          </NavLink>
          {(!isAuthenticated || user?.role === 'CUSTOMER') && (
            <NavLink to="/categories" onClick={closeMenu} className={navLinkClass}>
              Categories
            </NavLink>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 md:border-0 md:pt-0">
              <NavLink to={roleLandingPath(user.role)} className="rounded-lg px-3 py-2 font-semibold text-slate-700">
                {user.firstName}
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 md:border-0 md:pt-0">
              <NavLink to="/login" onClick={closeMenu} className="rounded-lg px-3 py-2 font-semibold text-slate-700">
                Login
              </NavLink>
              <NavLink to="/register" onClick={closeMenu} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white">
                Register
              </NavLink>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
