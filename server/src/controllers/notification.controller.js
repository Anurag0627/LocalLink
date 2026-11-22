import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const listNotifications = asyncHandler(async (request, response) => {
  const result = await notificationService.listNotifications(
    request.user._id,
    request.validatedQuery,
  );
  return new ApiResponse(
    200,
    'Notifications retrieved successfully',
    result.items,
    result.meta,
  ).send(response);
});

export const getUnreadCount = asyncHandler(async (request, response) => {
  const count = await notificationService.getUnreadCount(request.user._id);
  return new ApiResponse(200, 'Unread notification count retrieved', { count }).send(response);
});

export const getNotification = asyncHandler(async (request, response) => {
  const notification = await notificationService.getNotification(
    request.user._id,
    request.validatedParams.notificationId,
  );
  return new ApiResponse(200, 'Notification retrieved successfully', notification).send(response);
});

export const markNotificationRead = asyncHandler(async (request, response) => {
  const notification = await notificationService.markNotificationRead(
    request.user._id,
    request.validatedParams.notificationId,
  );
  return new ApiResponse(200, 'Notification marked as read', notification).send(response);
});

export const markAllNotificationsRead = asyncHandler(async (request, response) => {
  const result = await notificationService.markAllNotificationsRead(request.user._id);
  return new ApiResponse(200, 'All notifications marked as read', {
    modifiedCount: result.modifiedCount,
  }).send(response);
});

export const deleteNotification = asyncHandler(async (request, response) => {
  await notificationService.deleteNotification(
    request.user._id,
    request.validatedParams.notificationId,
  );
  return new ApiResponse(200, 'Notification deleted successfully').send(response);
});

export const getPreferences = asyncHandler(async (request, response) => {
  const preferences = await notificationService.getPreferences(request.user._id);
  return new ApiResponse(200, 'Notification preferences retrieved', preferences).send(response);
});

export const updatePreferences = asyncHandler(async (request, response) => {
  const preferences = await notificationService.updatePreferences(
    request.user._id,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Notification preferences updated', preferences).send(response);
});
