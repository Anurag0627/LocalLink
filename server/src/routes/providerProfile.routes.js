import { Router } from 'express';
import * as providerProfileController from '../controllers/providerProfile.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createServiceAreaSchema,
  providerAvailabilitySchema,
  providerProfileUpdateSchema,
  serviceAreaParamsSchema,
  updateServiceAreaSchema,
} from '../validators/profile.validator.js';
import * as reviewController from '../controllers/review.controller.js';
import { reviewQuerySchema } from '../validators/review.validator.js';

const providerProfileRoutes = Router();

providerProfileRoutes.use(authenticate, authorizeRoles('PROVIDER'));

providerProfileRoutes.get('/profile', providerProfileController.getProfile);
providerProfileRoutes.patch(
  '/profile',
  validate(providerProfileUpdateSchema),
  providerProfileController.updateProfile,
);
providerProfileRoutes.get('/service-areas', providerProfileController.listServiceAreas);
providerProfileRoutes.post(
  '/service-areas',
  validate(createServiceAreaSchema),
  providerProfileController.addServiceArea,
);
providerProfileRoutes.patch(
  '/service-areas/:areaId',
  validate(serviceAreaParamsSchema, 'params'),
  validate(updateServiceAreaSchema),
  providerProfileController.updateServiceArea,
);
providerProfileRoutes.delete(
  '/service-areas/:areaId',
  validate(serviceAreaParamsSchema, 'params'),
  providerProfileController.deleteServiceArea,
);
providerProfileRoutes.patch(
  '/availability',
  validate(providerAvailabilitySchema),
  providerProfileController.updateAvailability,
);
providerProfileRoutes.get(
  '/reviews',
  validate(reviewQuerySchema, 'query'),
  reviewController.listProviderOwnedReviews,
);
providerProfileRoutes.get(
  '/ratings',
  reviewController.listProviderOwnedRatings,
);

export default providerProfileRoutes;
