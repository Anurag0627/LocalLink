import { Link, Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" className="font-bold text-slate-800">
            Local<span className="text-indigo-600">Link</span>
          </Link>
          <p>Helping your neighborhood get more done.</p>
          <p>© {new Date().getFullYear()} LocalLink</p>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
