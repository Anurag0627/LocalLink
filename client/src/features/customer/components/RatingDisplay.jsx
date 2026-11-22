import { Star } from 'lucide-react';

export default function RatingDisplay({ rating, count = 0, compact = false }) {
  const value = typeof rating === 'number' ? rating : 0;
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${value} out of 5 stars, ${count} reviews`}>
      <Star size={15} className={value > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      <span className="font-semibold text-slate-800">{value > 0 ? value.toFixed(1) : 'No ratings'}</span>
      {!compact && <span className="text-slate-500">({count})</span>}
    </span>
  );
}
