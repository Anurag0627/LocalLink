import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '../features/auth/schemas/auth.schemas.js';
import { useAuth } from '../features/auth/context/useAuth.js';
import PasswordInput from '../components/common/PasswordInput.jsx';
import Alert from '../components/common/Alert.jsx';
import { normalizeApiError } from '../lib/api.js';
import { roleLandingPath } from '../utils/roleLanding.js';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values) {
    setServerError('');
    try {
      const user = await login(values);
      const intended = location.state?.from;
      navigate(intended && intended !== '/login' ? intended : roleLandingPath(user.role), { replace: true });
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft size={16} />Back home
      </Link>
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <LogIn size={22} />
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to your LocalLink account.</p>
        {serverError && <div className="mt-5"><Alert>{serverError}</Alert></div>}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <PasswordInput id="login-password" label="Password" autoComplete="current-password" {...register('password')} error={errors.password} />
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          New to LocalLink? <Link to="/register" className="font-semibold text-indigo-700">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
