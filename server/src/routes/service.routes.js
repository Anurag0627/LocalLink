import { Router } from 'express';
import * as serviceController from '../controllers/service.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createServiceSchema,
  providerServiceQuerySchema,
  serviceIdParamsSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
} from '../validators/service.validator.js';

const serviceRoutes = Router();

serviceRoutes.use(authenticate, authorizeRoles('PROVIDER'));
serviceRoutes.post('/', validate(createServiceSchema), serviceController.createService);
serviceRoutes.get('/mine', validate(providerServiceQuerySchema, 'query'), serviceController.listMine);
serviceRoutes.get('/:serviceId', validate(serviceIdParamsSchema, 'params'), serviceController.getOwnedService);
serviceRoutes.patch('/:serviceId/status', validate(serviceIdParamsSchema, 'params'), validate(updateServiceStatusSchema), serviceController.updateServiceStatus);
serviceRoutes.patch('/:serviceId', validate(serviceIdParamsSchema, 'params'), validate(updateServiceSchema), serviceController.updateService);
serviceRoutes.delete('/:serviceId', validate(serviceIdParamsSchema, 'params'), serviceController.deleteService);

export default serviceRoutes;
