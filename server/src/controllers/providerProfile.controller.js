import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as providerProfileService from '../services/providerProfile.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getProfile = asyncHandler(async (request, response) => {
  const data = await providerProfileService.getProfile(request.user);
  return new ApiResponse(200, 'Provider profile retrieved', data).send(response);
});

export const updateProfile = asyncHandler(async (request, response) => {
  const data = await providerProfileService.updateProfile(
    request.user,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Provider profile updated successfully', data).send(response);
});

export const listServiceAreas = asyncHandler(async (request, response) => {
  const data = await providerProfileService.listServiceAreas(request.user);
  return new ApiResponse(200, 'Provider service areas retrieved', data).send(response);
});

export const addServiceArea = asyncHandler(async (request, response) => {
  const data = await providerProfileService.addServiceArea(
    request.user,
    request.validatedBody,
  );
  return new ApiResponse(201, 'Service area added successfully', data).send(response);
});

export const updateServiceArea = asyncHandler(async (request, response) => {
  const data = await providerProfileService.updateServiceArea(
    request.user,
    request.validatedParams.areaId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Service area updated successfully', data).send(response);
});

export const deleteServiceArea = asyncHandler(async (request, response) => {
  const data = await providerProfileService.deleteServiceArea(
    request.user,
    request.validatedParams.areaId,
  );
  return new ApiResponse(200, 'Service area deleted successfully', data).send(response);
});

export const updateAvailability = asyncHandler(async (request, response) => {
  const data = await providerProfileService.updateAvailability(
    request.user,
    request.validatedBody.isAvailable,
  );
  return new ApiResponse(200, 'Provider availability updated successfully', data).send(response);
});
