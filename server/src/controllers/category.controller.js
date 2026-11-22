import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as categoryService from '../services/category.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const listPublic = asyncHandler(async (request, response) => {
  const result = await categoryService.listPublic(request.validatedQuery);
  return new ApiResponse(200, 'Categories retrieved successfully', result.items, {
    page: request.validatedQuery.page,
    limit: request.validatedQuery.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / request.validatedQuery.limit),
  }).send(response);
});

export const getPublicBySlug = asyncHandler(async (request, response) => {
  const data = await categoryService.getPublicBySlug(request.validatedParams.slug);
  return new ApiResponse(200, 'Category retrieved successfully', data).send(response);
});

export const createCategory = asyncHandler(async (request, response) => {
  const data = await categoryService.createCategory(request.user, request.validatedBody);
  return new ApiResponse(201, 'Category created successfully', data).send(response);
});

export const updateCategory = asyncHandler(async (request, response) => {
  const data = await categoryService.updateCategory(
    request.user,
    request.validatedParams.categoryId,
    request.validatedBody,
  );
  return new ApiResponse(200, 'Category updated successfully', data).send(response);
});

export const updateCategoryStatus = asyncHandler(async (request, response) => {
  const data = await categoryService.updateCategoryStatus(
    request.user,
    request.validatedParams.categoryId,
    request.validatedBody.isActive,
  );
  return new ApiResponse(200, 'Category status updated successfully', data).send(response);
});

export const deleteCategory = asyncHandler(async (request, response) => {
  const data = await categoryService.deleteCategory(request.user, request.validatedParams.categoryId);
  return new ApiResponse(200, 'Category deletion handled successfully', data).send(response);
});
