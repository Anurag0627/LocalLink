import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  adminReviewQuerySchema,
  moderateReviewSchema,
  reviewIdSchema,
} from '../validators/review.validator.js';

const reviewModerationRoutes = Router();

reviewModerationRoutes.use(authenticate, authorizeRoles('ADMIN'));
reviewModerationRoutes.get(
  '/reviews',
  validate(adminReviewQuerySchema, 'query'),
  reviewController.listAdminReviews,
);
reviewModerationRoutes.patch(
  '/reviews/:reviewId/moderation',
  validate(reviewIdSchema, 'params'),
  validate(moderateReviewSchema),
  reviewController.moderateReview,
);

export default reviewModerationRoutes;
