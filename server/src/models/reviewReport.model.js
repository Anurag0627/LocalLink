import mongoose, { Schema } from 'mongoose';

const reviewReportSchema = new Schema(
  {
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['SPAM', 'ABUSIVE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'OTHER'],
      required: true,
    },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

reviewReportSchema.index({ review: 1, reporter: 1 }, { unique: true });

const ReviewReport =
  mongoose.models.ReviewReport
  || mongoose.model('ReviewReport', reviewReportSchema);

export default ReviewReport;
