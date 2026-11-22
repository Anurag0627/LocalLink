import { useEffect, useState } from 'react';
import { getProviderOwnedReviews, getProviderRatingSummary } from '../services/review.service.js';
import RatingSummary from '../components/RatingSummary.jsx';
import ReviewCard from '../components/ReviewCard.jsx';
import Pagination from '../../customer/components/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../customer/components/StateViews.jsx';

export default function ProviderReviewsPage() {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProviderRatingSummary(),
      getProviderOwnedReviews({ page, limit: 10, sortBy: 'newest' }),
    ]).then(([summaryResponse, reviewsResponse]) => {
      if (!active) return;
      setSummary(summaryResponse.data.data);
      setReviews(reviewsResponse.data.data || []);
      setMeta(reviewsResponse.data.meta || {});
    }).catch((requestError) => {
      if (active) setError(requestError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page]);

  if (loading) return <LoadingState label="Loading provider reviews..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <p className="font-semibold text-indigo-600">Customer feedback</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Reviews</h1>
      <div className="mt-6">
        {summary && (
          <RatingSummary
            averageRating={summary.averageRating}
            totalReviews={summary.totalReviews}
            distribution={summary.ratingDistribution}
          />
        )}
      </div>
      {reviews.length === 0 ? (
        <div className="mt-6"><EmptyState title="No published reviews" description="Your published customer reviews will appear here." /></div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white px-5">
            {reviews.map((review) => <ReviewCard key={review._id} review={review} allowReport={false} />)}
          </div>
          <div className="mt-6"><Pagination page={meta.page || page} totalPages={meta.totalPages} onPageChange={setPage} /></div>
        </>
      )}
    </div>
  );
}
