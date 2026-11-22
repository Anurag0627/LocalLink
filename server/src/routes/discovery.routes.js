import { Router } from 'express';
import * as discoveryController from '../controllers/discovery.controller.js';
import validate from '../middlewares/validate.middleware.js';
import {
  discoveryCategoryQuerySchema,
  discoveryQuerySchema,
  publicProviderParamsSchema,
  publicProviderServicesQuerySchema,
} from '../validators/discovery.validator.js';
import { serviceIdParamsSchema } from '../validators/service.validator.js';

const discoveryRoutes = Router();

discoveryRoutes.get('/categories', validate(discoveryCategoryQuerySchema, 'query'), discoveryController.listCategories);
discoveryRoutes.get('/services', validate(discoveryQuerySchema, 'query'), discoveryController.listServices);
discoveryRoutes.get('/services/:serviceId', validate(serviceIdParamsSchema, 'params'), discoveryController.getService);
discoveryRoutes.get(
  '/providers/:providerId/services',
  validate(publicProviderParamsSchema, 'params'),
  validate(publicProviderServicesQuerySchema, 'query'),
  discoveryController.listProviderServices,
);
discoveryRoutes.get(
  '/providers/:providerId',
  validate(publicProviderParamsSchema, 'params'),
  discoveryController.getProvider,
);

export default discoveryRoutes;
