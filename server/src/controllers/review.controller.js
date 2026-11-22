import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as reviewService from '../services/review.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createReview = asyncHandler(async (request, response) => {
  const data = await reviewService.createReview(request.user, request.validatedBody);
  return new ApiResponse(201, 'Review created successfully', data).send(response);
});

export const listProviderReviews = asyncHandler(async (request, response) => {
  const result = await reviewService.listProviderReviews(
    request.validatedParams.providerId,
    request.validatedQuery,
  );
  return new ApiResponse(200, 'Provider reviews retrieved successfully', result.items, result.meta).send(response);
});

export const listServiceReviews = asyncHandler(async (request, response) => {
  const result = await reviewService.listServiceReviews(
    request.validatedParams.serviceId,
    request.validatedQuery,
  );
  return new ApiResponse(200, 'Service reviews retrieved successfully', result.items, result.meta).send(response);
});

export const getReview = asyncHandler(async (request, response) => {
  const data = await reviewService.getPublicReview(request.validatedParams.reviewId);
  return new ApiResponse(200, 'Review retrieved successfully', data).send(response);
});

export const listMyReviews = asyncHandler(async (request, response) => {
  const result = await reviewService.listMyReviews(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Customer reviews retrieved successfully', result.items, result.meta).send(response);
});

export const updateReview = asyncHandler(async (request, response) => {
  const data = await reviewService.updateReview(
    request.user,
    request.validatedParams.reviewId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Review updated successfully', data).send(response);
});

export const deleteReview = asyncHandler(async (request, response) => {
  const data = await reviewService.deleteReview(request.user, request.validatedParams.reviewId);
  return new ApiResponse(200, 'Review deleted successfully', data).send(response);
});

export const reportReview = asyncHandler(async (request, response) => {
  const data = await reviewService.reportReview(
    request.user,
    request.validatedParams.reviewId,
    request.validatedBody,
  );
  return new ApiResponse(201, 'Review reported successfully', data).send(response);
});

export const listProviderOwnedReviews = asyncHandler(async (request, response) => {
  const result = await reviewService.listProviderOwnedReviews(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Provider reviews retrieved successfully', result.items, result.meta).send(response);
});

export const listProviderOwnedRatings = asyncHandler(async (request, response) => {
  const data = await reviewService.listProviderOwnedRatings(request.user);
  return new ApiResponse(200, 'Provider ratings retrieved successfully', data).send(response);
});

export const listAdminReviews = asyncHandler(async (request, response) => {
  const result = await reviewService.listAdminReviews(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Reviews retrieved successfully', result.items, result.meta).send(response);
});

export const moderateReview = asyncHandler(async (request, response) => {
  const data = await reviewService.moderateReview(
    request.user,
    request.validatedParams.reviewId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Review moderation updated successfully', data).send(response);
});
