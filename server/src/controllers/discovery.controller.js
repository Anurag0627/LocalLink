import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as discoveryService from '../services/discovery.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const listServices = asyncHandler(async (request, response) => {
  const result = await discoveryService.listServices(request.validatedQuery);
  return new ApiResponse(200, 'Services retrieved successfully', result.items, result.meta).send(response);
});

export const getService = asyncHandler(async (request, response) => {
  const data = await discoveryService.getService(request.validatedParams.serviceId);
  return new ApiResponse(200, 'Service retrieved successfully', data).send(response);
});

export const listCategories = asyncHandler(async (request, response) => {
  const result = await discoveryService.listCategories(request.validatedQuery);
  return new ApiResponse(200, 'Categories retrieved successfully', result.items, result.meta).send(response);
});

export const getProvider = asyncHandler(async (request, response) => {
  const data = await discoveryService.getProvider(request.validatedParams.providerId);
  return new ApiResponse(200, 'Provider retrieved successfully', data).send(response);
});

export const listProviderServices = asyncHandler(async (request, response) => {
  const result = await discoveryService.listProviderServices(
    request.validatedParams.providerId,
    request.validatedQuery,
  );
  return new ApiResponse(200, 'Provider services retrieved successfully', result.items, result.meta).send(response);
});
