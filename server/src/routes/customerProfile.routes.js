import { Router } from 'express';
import * as customerProfileController from '../controllers/customerProfile.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  addressParamsSchema,
  createAddressSchema,
  customerProfileUpdateSchema,
  updateAddressSchema,
} from '../validators/profile.validator.js';

const customerProfileRoutes = Router();

customerProfileRoutes.use(authenticate, authorizeRoles('CUSTOMER'));

customerProfileRoutes.get('/profile', customerProfileController.getProfile);
customerProfileRoutes.patch(
  '/profile',
  validate(customerProfileUpdateSchema),
  customerProfileController.updateProfile,
);
customerProfileRoutes.get('/addresses', customerProfileController.listAddresses);
customerProfileRoutes.post(
  '/addresses',
  validate(createAddressSchema),
  customerProfileController.addAddress,
);
customerProfileRoutes.patch(
  '/addresses/:addressId/default',
  validate(addressParamsSchema, 'params'),
  customerProfileController.setAddressDefault,
);
customerProfileRoutes.patch(
  '/addresses/:addressId',
  validate(addressParamsSchema, 'params'),
  validate(updateAddressSchema),
  customerProfileController.updateAddress,
);
customerProfileRoutes.delete(
  '/addresses/:addressId',
  validate(addressParamsSchema, 'params'),
  customerProfileController.deleteAddress,
);

export default customerProfileRoutes;
