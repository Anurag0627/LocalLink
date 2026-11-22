import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as customerProfileService from '../services/customerProfile.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getProfile = asyncHandler(async (request, response) => {
  const data = await customerProfileService.getProfile(request.user);
  return new ApiResponse(200, 'Customer profile retrieved', data).send(response);
});

export const updateProfile = asyncHandler(async (request, response) => {
  const data = await customerProfileService.updateProfile(
    request.user,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Customer profile updated successfully', data).send(response);
});

export const listAddresses = asyncHandler(async (request, response) => {
  const data = await customerProfileService.listAddresses(request.user);
  return new ApiResponse(200, 'Customer addresses retrieved', data).send(response);
});

export const addAddress = asyncHandler(async (request, response) => {
  const data = await customerProfileService.addAddress(
    request.user,
    request.validatedBody,
  );
  return new ApiResponse(201, 'Address added successfully', data).send(response);
});

export const updateAddress = asyncHandler(async (request, response) => {
  const data = await customerProfileService.updateAddress(
    request.user,
    request.validatedParams.addressId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Address updated successfully', data).send(response);
});

export const deleteAddress = asyncHandler(async (request, response) => {
  const data = await customerProfileService.deleteAddress(
    request.user,
    request.validatedParams.addressId,
  );
  return new ApiResponse(200, 'Address deleted successfully', data).send(response);
});

export const setAddressDefault = asyncHandler(async (request, response) => {
  const data = await customerProfileService.setAddressDefault(
    request.user,
    request.validatedParams.addressId,
  );
  return new ApiResponse(200, 'Default address updated successfully', data).send(response);
});
