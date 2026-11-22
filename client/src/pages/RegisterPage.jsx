import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, UserRoundPlus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  customerRegistrationSchema,
  providerRegistrationSchema,
} from '../features/auth/schemas/auth.schemas.js';
import { useAuth } from '../features/auth/context/useAuth.js';
import PasswordInput from '../components/common/PasswordInput.jsx';
import Alert from '../components/common/Alert.jsx';
import { normalizeApiError } from '../lib/api.js';
import { roleLandingPath } from '../utils/roleLanding.js';

function TextField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        id={id}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}

function RegisterPage() {
  const params = useParams();
  const [role, setRole] = useState(params.role === 'provider' ? 'PROVIDER' : 'CUSTOMER');
  const { registerCustomer, registerProvider } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const schema = role === 'PROVIDER' ? providerRegistrationSchema : customerRegistrationSchema;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  function switchRole(nextRole) {
    setRole(nextRole);
    setServerError('');
    reset();
  }

  async function onSubmit(values) {
    setServerError('');
    try {
      const user = role === 'PROVIDER'
        ? await registerProvider(values)
        : await registerCustomer(values);
      navigate(roleLandingPath(user.role), { replace: true });
    } catch (error) {
      setServerError(normalizeApiError(error).message);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft size={16} />Back home
      </Link>
      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <UserRoundPlus size={22} />
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">Create your account</h1>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => switchRole('CUSTOMER')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${role === 'CUSTOMER' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Customer</button>
          <button type="button" onClick={() => switchRole('PROVIDER')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${role === 'PROVIDER' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Provider</button>
        </div>
        {serverError && <div className="mt-5"><Alert>{serverError}</Alert></div>}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="firstName" label="First name" autoComplete="given-name" {...register('firstName')} error={errors.firstName} />
            <TextField id="lastName" label="Last name" autoComplete="family-name" {...register('lastName')} error={errors.lastName} />
          </div>
          <TextField id="register-email" label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email} />
          {role === 'PROVIDER' && (
            <>
              <TextField id="businessName" label="Business name" {...register('businessName')} error={errors.businessName} />
              <TextField id="experienceYears" label="Experience years" type="number" min="0" max="80" {...register('experienceYears')} error={errors.experienceYears} />
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">Description (optional)</label>
                <textarea id="description" rows="4" {...register('description')} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" />
                {errors.description && <p className="mt-1.5 text-sm text-red-600">{errors.description.message}</p>}
              </div>
            </>
          )}
          <PasswordInput id="register-password" label="Password" autoComplete="new-password" {...register('password')} error={errors.password} />
          <PasswordInput id="confirmPassword" label="Confirm password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword} />
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Creating account...' : `Register as ${role.toLowerCase()}`}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-indigo-700">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
