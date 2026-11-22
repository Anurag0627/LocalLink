import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as serviceService from '../services/service.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createService = asyncHandler(async (request, response) => {
  const data = await serviceService.createService(request.user, request.validatedBody);
  return new ApiResponse(201, 'Service created successfully', data).send(response);
});

export const listMine = asyncHandler(async (request, response) => {
  const result = await serviceService.listMine(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Services retrieved successfully', result.items, result.meta).send(response);
});

export const getOwnedService = asyncHandler(async (request, response) => {
  const data = await serviceService.getOwnedService(request.user, request.validatedParams.serviceId);
  return new ApiResponse(200, 'Service retrieved successfully', data).send(response);
});

export const updateService = asyncHandler(async (request, response) => {
  const data = await serviceService.updateService(
    request.user,
    request.validatedParams.serviceId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Service updated successfully', data).send(response);
});

export const updateServiceStatus = asyncHandler(async (request, response) => {
  const data = await serviceService.updateServiceStatus(
    request.user,
    request.validatedParams.serviceId,
    request.validatedBody.isActive,
  );
  return new ApiResponse(200, 'Service status updated successfully', data).send(response);
});

export const deleteService = asyncHandler(async (request, response) => {
  const data = await serviceService.deleteService(request.user, request.validatedParams.serviceId);
  return new ApiResponse(200, 'Service deleted successfully', data).send(response);
});
