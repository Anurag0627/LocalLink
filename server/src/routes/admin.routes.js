import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  adminAccountStatusSchema,
  adminBookingQuerySchema,
  adminCustomerQuerySchema,
  adminProviderQuerySchema,
  adminReportQuerySchema,
  adminServiceQuerySchema,
  adminServiceStatusSchema,
  bookingIdParamsSchema,
  customerIdParamsSchema,
  providerIdParamsSchema,
  serviceIdParamsSchema,
  verificationSchema,
} from '../validators/admin.validator.js';
import { publicCategoryQuerySchema } from '../validators/category.validator.js';

const adminRoutes = Router();
adminRoutes.use(authenticate, authorizeRoles('ADMIN'));

adminRoutes.get('/dashboard', adminController.getDashboard);
adminRoutes.get('/customers', validate(adminCustomerQuerySchema, 'query'), adminController.listCustomers);
adminRoutes.get('/customers/:customerId', validate(customerIdParamsSchema, 'params'), adminController.getCustomer);
adminRoutes.patch('/customers/:customerId/status', validate(customerIdParamsSchema, 'params'), validate(adminAccountStatusSchema), adminController.updateCustomerStatus);
adminRoutes.get('/providers', validate(adminProviderQuerySchema, 'query'), adminController.listProviders);
adminRoutes.get('/providers/:providerId', validate(providerIdParamsSchema, 'params'), adminController.getProvider);
adminRoutes.patch('/providers/:providerId/status', validate(providerIdParamsSchema, 'params'), validate(adminAccountStatusSchema), adminController.updateProviderStatus);
adminRoutes.patch('/providers/:providerId/verification', validate(providerIdParamsSchema, 'params'), validate(verificationSchema), adminController.updateProviderVerification);
adminRoutes.get('/services', validate(adminServiceQuerySchema, 'query'), adminController.listServices);
adminRoutes.patch('/services/:serviceId/status', validate(serviceIdParamsSchema, 'params'), validate(adminServiceStatusSchema), adminController.updateServiceStatus);
adminRoutes.get('/categories', validate(publicCategoryQuerySchema, 'query'), adminController.listCategories);
adminRoutes.get('/bookings', validate(adminBookingQuerySchema, 'query'), adminController.listBookings);
adminRoutes.get('/bookings/:bookingId', validate(bookingIdParamsSchema, 'params'), adminController.getBooking);
adminRoutes.get('/reports', validate(adminReportQuerySchema, 'query'), adminController.listReports);

export default adminRoutes;
