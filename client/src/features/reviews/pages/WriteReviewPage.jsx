import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyBookingById } from '../../booking/services/booking.service.js';
import { createReview } from '../services/review.service.js';
import RatingInput from '../components/RatingInput.jsx';
import { LoadingState, ErrorState } from '../../customer/components/StateViews.jsx';

export default function WriteReviewPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getMyBookingById(bookingId)
      .then((response) => {
        if (active) setBooking(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [bookingId]);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!rating) {
      setError({ message: 'Choose a rating from 1 to 5.' });
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        booking: bookingId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        images: [],
      });
      navigate('/customer/reviews');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Checking booking eligibility..." />;
  if (error && !booking) return <ErrorState error={error} />;
  if (!booking) return <ErrorState error={{ message: 'Booking not found.' }} />;
  if (booking.status !== 'COMPLETED') {
    return <ErrorState error={{ message: 'Only completed bookings can be reviewed.' }} />;
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <p className="font-semibold text-indigo-600">Feedback</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Write a review</h1>
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
        <p className="text-sm text-slate-500">Completed service</p>
        <p className="mt-1 font-bold text-slate-900">{booking.serviceSnapshot?.title || 'LocalLink service'}</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
        <form onSubmit={submit} className="mt-6 space-y-5">
          <RatingInput value={rating} onChange={setRating} />
          <label className="block text-sm font-semibold text-slate-700">Comment
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="2000" rows="5" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none" placeholder="Share your experience" />
          </label>
          <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit review'}</button>
        </form>
      </div>
    </section>
  );
}
