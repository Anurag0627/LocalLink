import RatingStars from './RatingStars.jsx';

export default function RatingSummary({ averageRating = 0, totalReviews = 0, distribution }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-3xl font-bold text-slate-900">{Number(averageRating || 0).toFixed(1)}</p>
          <RatingStars rating={averageRating} />
        </div>
        <p className="text-sm text-slate-500">{totalReviews} published review{totalReviews === 1 ? '' : 's'}</p>
      </div>
      {distribution && (
        <div className="mt-5 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating] || 0;
            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={rating} className="grid grid-cols-[28px_1fr_32px] items-center gap-2 text-xs text-slate-500">
                <span>{rating} star</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-label={`${rating} star reviews`} aria-valuemin="0" aria-valuemax={totalReviews} aria-valuenow={count}>
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
