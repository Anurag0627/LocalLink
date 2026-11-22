import { useState } from 'react';
import RatingStars from './RatingStars.jsx';
import { reportReview } from '../services/review.service.js';
import { useAuth } from '../../auth/context/useAuth.js';

const reportReasons = [
  ['SPAM', 'Spam'],
  ['ABUSIVE_CONTENT', 'Abusive content'],
  ['FALSE_INFORMATION', 'False information'],
  ['HARASSMENT', 'Harassment'],
  ['OTHER', 'Other'],
];

export default function ReviewCard({ review, actions, allowReport = true }) {
  const { isAuthenticated } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reason) {
      setError('Select a report reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reportReview(review._id, { reason, ...(description.trim() ? { description: description.trim() } : {}) });
      setSuccess('Report submitted.');
      setReportOpen(false);
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit the report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="border-b border-slate-100 py-5 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">
            {review.customer?.firstName || 'Customer'}{review.customer?.lastName ? ` ${review.customer.lastName}` : ''}
          </p>
          <div className="mt-1"><RatingStars rating={review.rating} /></div>
        </div>
        {review.createdAt && <time className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</time>}
      </div>
      {review.comment && <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>}
      {actions && <div className="mt-4">{actions}</div>}
      {allowReport && isAuthenticated && (
        <div className="mt-4">
          <button type="button" onClick={() => { setReportOpen(true); setSuccess(''); }} className="text-xs font-semibold text-slate-500 hover:text-red-700">Report review</button>
        </div>
      )}
      {success && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{success}</p>}
      {reportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-5" role="dialog" aria-modal="true" aria-label="Report review">
          <form onSubmit={submitReport} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Report review</h2>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Reason
              <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3">
                <option value="">Select reason</option>
                {reportReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Additional details
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="4" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit report'}</button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
