import RatingDisplay from './RatingDisplay.jsx';

export default function ReviewsList({ reviews }) {
  if (!reviews?.length) {
    return <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No published reviews yet.</p>;
  }
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review._id} className="border-b border-slate-100 pb-4 last:border-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-800">
              {review.customer?.firstName || 'Customer'}{review.customer?.lastName ? ` ${review.customer.lastName}` : ''}
            </p>
            <RatingDisplay rating={review.rating} count={0} compact />
          </div>
          {review.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>}
          {review.createdAt && <time className="mt-2 block text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</time>}
        </article>
      ))}
    </div>
  );
}
