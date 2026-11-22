import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getProviderProfile, updateProviderProfile } from '../services/provider.service.js';
import { providerProfileSchema } from '../schemas/provider.schema.js';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(providerProfileSchema) });

  useEffect(() => {
    let active = true;
    getProviderProfile().then((response) => {
      if (!active) return;
      const data = response.data.data;
      const profile = data.profile;
      setVerificationStatus(profile.verificationStatus);
      reset({
        businessName: profile.businessName || '',
        description: profile.description || '',
        experienceYears: profile.experienceYears ?? 0,
        profileImage: profile.profileImage || '',
      });
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reset]);

  const submit = async (values) => {
    setSubmitting(true);
    setError(null);
    setSuccess('');
    const payload = {
      businessName: values.businessName,
      description: values.description || undefined,
      experienceYears: values.experienceYears,
      profileImage: values.profileImage || undefined,
    };
    try {
      const response = await updateProviderProfile(payload);
      const profile = response.data.data.profile;
      reset({ businessName: profile.businessName, description: profile.description || '', experienceYears: profile.experienceYears ?? 0, profileImage: profile.profileImage || '' });
      setSuccess('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading provider profile..." />;
  if (error && !loading && !success) return <ErrorState error={error} />;

  return (
    <div className="max-w-3xl">
      <p className="font-semibold text-indigo-600">Business profile</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">My Profile</h1>
      <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Verification: {verificationStatus}</div>
      {success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
      <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-5 rounded-2xl border border-slate-100 bg-white p-6">
        <label className="block text-sm font-semibold text-slate-700">Business name
          <input {...register('businessName')} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500" />
          {errors.businessName && <span className="mt-1 block text-xs text-red-600">{errors.businessName.message}</span>}
        </label>
        <label className="block text-sm font-semibold text-slate-700">Description
          <textarea {...register('description')} rows="5" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Experience years
          <input type="number" min="0" max="80" {...register('experienceYears')} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500" />
          {errors.experienceYears && <span className="mt-1 block text-xs text-red-600">{errors.experienceYears.message}</span>}
        </label>
        <label className="block text-sm font-semibold text-slate-700">Profile image URL
          <input type="url" {...register('profileImage')} placeholder="https://" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-indigo-500" />
          {errors.profileImage && <span className="mt-1 block text-xs text-red-600">{errors.profileImage.message}</span>}
        </label>
        <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Saving...' : 'Save profile'}</button>
      </form>
    </div>
  );
}
