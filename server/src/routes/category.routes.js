import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  categoryIdParamsSchema,
  categorySlugParamsSchema,
  publicCategoryQuerySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
} from '../validators/category.validator.js';

const categoryRoutes = Router();

categoryRoutes.get('/', validate(publicCategoryQuerySchema, 'query'), categoryController.listPublic);
categoryRoutes.get('/:slug', validate(categorySlugParamsSchema, 'params'), categoryController.getPublicBySlug);

categoryRoutes.post('/', authenticate, authorizeRoles('ADMIN'), validate(createCategorySchema), categoryController.createCategory);
categoryRoutes.patch('/:categoryId', authenticate, authorizeRoles('ADMIN'), validate(categoryIdParamsSchema, 'params'), validate(updateCategorySchema), categoryController.updateCategory);
categoryRoutes.patch('/:categoryId/status', authenticate, authorizeRoles('ADMIN'), validate(categoryIdParamsSchema, 'params'), validate(updateCategoryStatusSchema), categoryController.updateCategoryStatus);
categoryRoutes.delete('/:categoryId', authenticate, authorizeRoles('ADMIN'), validate(categoryIdParamsSchema, 'params'), categoryController.deleteCategory);

export default categoryRoutes;
