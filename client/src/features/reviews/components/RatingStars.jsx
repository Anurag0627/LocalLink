import { Star } from 'lucide-react';

export default function RatingStars({ rating, size = 17, label }) {
  const value = typeof rating === 'number' ? rating : 0;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={label || `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden="true"
          className={star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </span>
  );
}
