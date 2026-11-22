import { Star } from 'lucide-react';

const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function RatingInput({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-700">Rating</legend>
      <div className="mt-2 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            aria-label={`${rating} star${rating === 1 ? '' : 's'}: ${labels[rating - 1]}`}
            aria-pressed={value === rating}
            onClick={() => onChange(rating)}
            className="rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Star
              size={28}
              className={rating <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
            />
          </button>
        ))}
        {value > 0 && <span className="ml-2 text-sm font-semibold text-slate-600">{labels[value - 1]}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
