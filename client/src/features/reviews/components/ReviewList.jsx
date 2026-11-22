import ReviewCard from './ReviewCard.jsx';
import { EmptyState } from '../../customer/components/StateViews.jsx';

export default function ReviewList({ reviews }) {
  if (!reviews?.length) return <EmptyState title="No published reviews" description="There are no published reviews to display." />;
  return (
    <div>
      {reviews.map((review) => <ReviewCard key={review._id} review={review} />)}
    </div>
  );
}
