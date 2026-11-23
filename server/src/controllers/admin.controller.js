import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as adminService from '../services/admin.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getDashboard = asyncHandler(async (request, response) => {
  const data = await adminService.getDashboard(request.user);
  return new ApiResponse(200, 'Admin dashboard retrieved', data).send(response);
});

export const listCustomers = asyncHandler(async (request, response) => {
  const result = await adminService.listCustomers(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Customers retrieved', result.items, result.meta).send(response);
});

export const getCustomer = asyncHandler(async (request, response) => {
  const data = await adminService.getCustomer(request.user, request.validatedParams.customerId);
  return new ApiResponse(200, 'Customer retrieved', data).send(response);
});

export const updateCustomerStatus = asyncHandler(async (request, response) => {
  const data = await adminService.updateCustomerStatus(
    request.user,
    request.validatedParams.customerId,
    request.validatedBody.status,
  );
  return new ApiResponse(200, 'Customer status updated', data).send(response);
});

export const listProviders = asyncHandler(async (request, response) => {
  const result = await adminService.listProviders(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Providers retrieved', result.items, result.meta).send(response);
});

export const getProvider = asyncHandler(async (request, response) => {
  const data = await adminService.getProvider(request.user, request.validatedParams.providerId);
  return new ApiResponse(200, 'Provider retrieved', data).send(response);
});

export const updateProviderStatus = asyncHandler(async (request, response) => {
  const data = await adminService.updateProviderStatus(
    request.user,
    request.validatedParams.providerId,
    request.validatedBody.status,
  );
  return new ApiResponse(200, 'Provider status updated', data).send(response);
});

export const updateProviderVerification = asyncHandler(async (request, response) => {
  const data = await adminService.updateProviderVerification(
    request.user,
    request.validatedParams.providerId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Provider verification updated', data).send(response);
});

export const listServices = asyncHandler(async (request, response) => {
  const result = await adminService.listServices(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Services retrieved', result.items, result.meta).send(response);
});

export const updateServiceStatus = asyncHandler(async (request, response) => {
  const data = await adminService.updateServiceStatus(
    request.user,
    request.validatedParams.serviceId,
    request.validatedBody.isActive,
  );
  return new ApiResponse(200, 'Service status updated', data).send(response);
});

export const listCategories = asyncHandler(async (request, response) => {
  const result = await adminService.listCategories(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Categories retrieved', result.items, result.meta).send(response);
});

export const listBookings = asyncHandler(async (request, response) => {
  const result = await adminService.listBookings(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Bookings retrieved', result.items, result.meta).send(response);
});

export const getBooking = asyncHandler(async (request, response) => {
  const data = await adminService.getBooking(request.user, request.validatedParams.bookingId);
  return new ApiResponse(200, 'Booking retrieved', data).send(response);
});

export const listReports = asyncHandler(async (request, response) => {
  const result = await adminService.listReports(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Review reports retrieved', result.items, result.meta).send(response);
});
