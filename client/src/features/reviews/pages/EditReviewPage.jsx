import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyReviews, updateReview } from '../services/review.service.js';
import RatingInput from '../components/RatingInput.jsx';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function EditReviewPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMyReviews({ page: 1, limit: 100, sortBy: 'newest' })
      .then((response) => {
        if (!active) return;
        const review = (response.data.data || []).find((item) => item._id === reviewId);
        if (!review) {
          setError({ status: 404, message: 'Review not found.' });
          return;
        }
        setRating(review.rating);
        setComment(review.comment || '');
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reviewId]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await updateReview(reviewId, { rating, comment: comment.trim() || undefined });
      navigate('/customer/reviews');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading review..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="font-semibold text-indigo-600">My feedback</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Edit review</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-slate-100 bg-white p-6">
        <RatingInput value={rating} onChange={setRating} />
        <label className="block text-sm font-semibold text-slate-700">Comment
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="2000" rows="5" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" />
        </label>
        <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Saving...' : 'Save changes'}</button>
      </form>
    </section>
  );
}
