import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const reportReviewSchema = z.object({
  reason: z.enum(['SPAM', 'ABUSIVE_CONTENT', 'FALSE_INFORMATION', 'HARASSMENT', 'OTHER']),
  description: z.string().trim().min(1).max(2000).optional(),
});
