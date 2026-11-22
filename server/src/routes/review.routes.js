import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createReviewSchema,
  reportReviewSchema,
  reviewIdSchema,
  reviewOwnerIdSchema,
  reviewQuerySchema,
  serviceReviewIdSchema,
  updateReviewSchema,
} from '../validators/review.validator.js';

const reviewRoutes = Router();

reviewRoutes.get(
  '/providers/:providerId',
  validate(reviewOwnerIdSchema, 'params'),
  validate(reviewQuerySchema, 'query'),
  reviewController.listProviderReviews,
);
reviewRoutes.get(
  '/services/:serviceId',
  validate(serviceReviewIdSchema, 'params'),
  validate(reviewQuerySchema, 'query'),
  reviewController.listServiceReviews,
);
reviewRoutes.get(
  '/my',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate(reviewQuerySchema, 'query'),
  reviewController.listMyReviews,
);
reviewRoutes.post(
  '/',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate(createReviewSchema),
  reviewController.createReview,
);
reviewRoutes.post(
  '/:reviewId/report',
  authenticate,
  validate(reviewIdSchema, 'params'),
  validate(reportReviewSchema),
  reviewController.reportReview,
);
reviewRoutes.patch(
  '/:reviewId',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate(reviewIdSchema, 'params'),
  validate(updateReviewSchema),
  reviewController.updateReview,
);
reviewRoutes.delete(
  '/:reviewId',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validate(reviewIdSchema, 'params'),
  reviewController.deleteReview,
);
reviewRoutes.get(
  '/:reviewId',
  validate(reviewIdSchema, 'params'),
  reviewController.getReview,
);

export default reviewRoutes;
