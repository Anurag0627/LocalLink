import { Router } from 'express';
import * as accountController from '../controllers/account.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  accountUpdateSchema,
  changePasswordSchema,
} from '../validators/account.validator.js';

const accountRoutes = Router();

accountRoutes.use(authenticate);
accountRoutes.get('/', accountController.getAccount);
accountRoutes.patch(
  '/',
  validate(accountUpdateSchema),
  accountController.updateAccount,
);
accountRoutes.patch(
  '/change-password',
  validate(changePasswordSchema),
  accountController.changePassword,
);

export default accountRoutes;
