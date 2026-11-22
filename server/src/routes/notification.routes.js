import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  notificationIdSchema,
  notificationPreferenceSchema,
  notificationQuerySchema,
} from '../validators/notification.validator.js';

const notificationRoutes = Router();

notificationRoutes.use(authenticate);
notificationRoutes.get(
  '/',
  validate(notificationQuerySchema, 'query'),
  notificationController.listNotifications,
);
notificationRoutes.get('/unread-count', notificationController.getUnreadCount);
notificationRoutes.get('/preferences', notificationController.getPreferences);
notificationRoutes.patch(
  '/preferences',
  validate(notificationPreferenceSchema),
  notificationController.updatePreferences,
);
notificationRoutes.patch('/read-all', notificationController.markAllNotificationsRead);
notificationRoutes.get(
  '/:notificationId',
  validate(notificationIdSchema, 'params'),
  notificationController.getNotification,
);
notificationRoutes.patch(
  '/:notificationId/read',
  validate(notificationIdSchema, 'params'),
  notificationController.markNotificationRead,
);
notificationRoutes.delete(
  '/:notificationId',
  validate(notificationIdSchema, 'params'),
  notificationController.deleteNotification,
);

export default notificationRoutes;
