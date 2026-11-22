import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReviews, deleteReview } from '../services/review.service.js';
import RatingStars from '../components/RatingStars.jsx';
import Pagination from '../../customer/components/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState('');

  useEffect(() => {
    let active = true;
    getMyReviews({ page, limit: 10, sortBy })
      .then((response) => {
        if (!active) return;
        setReviews(response.data.data || []);
        setMeta(response.data.meta || {});
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, sortBy]);

  const remove = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    setMutating(reviewId);
    setError(null);
    try {
      await deleteReview(reviewId);
      setReviews((current) => current.filter((review) => review._id !== reviewId));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setMutating('');
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="font-semibold text-indigo-600">My feedback</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="mt-2 text-3xl font-bold text-slate-900">My Reviews</h1>
        <label className="text-sm font-semibold text-slate-600">Sort
          <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="ml-2 rounded-lg border border-slate-200 px-3 py-2">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </label>
      </div>
      {loading && <div className="mt-6"><LoadingState label="Loading reviews..." /></div>}
      {!loading && error && <div className="mt-6"><ErrorState error={error} /></div>}
      {!loading && !error && reviews.length === 0 && <div className="mt-6"><EmptyState title="No reviews yet" description="Reviews for completed bookings will appear here." /></div>}
      {!loading && !error && reviews.length > 0 && (
        <>
          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <article key={review._id} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <RatingStars rating={review.rating} />
                    <p className="mt-2 font-bold text-slate-900">{review.service?.title || 'LocalLink service'}</p>
                    {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
                    {review.status && <p className="mt-3 text-xs font-semibold text-slate-400">Status: {review.status}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <Link to={`/customer/reviews/${review._id}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">Edit</Link>
                    <button type="button" disabled={mutating === review._id} onClick={() => remove(review._id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6"><Pagination page={meta.page || page} totalPages={meta.totalPages} onPageChange={setPage} /></div>
        </>
      )}
    </section>
  );
}
