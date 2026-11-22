import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import * as bookingService from '../services/booking.service.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.createBooking(request.user, request.validatedBody);
  return new ApiResponse(201, 'Booking created successfully', data).send(response);
});

export const listCustomerBookings = asyncHandler(async (request, response) => {
  const result = await bookingService.listCustomerBookings(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Bookings retrieved successfully', result.items, result.meta).send(response);
});

export const getCustomerBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.getCustomerBooking(request.user, request.validatedParams.bookingId);
  return new ApiResponse(200, 'Booking retrieved successfully', data).send(response);
});

export const cancelCustomerBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.cancelCustomerBooking(
    request.user,
    request.validatedParams.bookingId,
    request.validatedBody.reason,
  );
  return new ApiResponse(200, 'Booking cancelled successfully', data).send(response);
});

export const listProviderBookings = asyncHandler(async (request, response) => {
  const result = await bookingService.listProviderBookings(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Bookings retrieved successfully', result.items, result.meta).send(response);
});

export const getProviderBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.getProviderBooking(request.user, request.validatedParams.bookingId);
  return new ApiResponse(200, 'Booking retrieved successfully', data).send(response);
});

export const acceptBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.acceptBooking(request.user, request.validatedParams.bookingId);
  return new ApiResponse(200, 'Booking accepted successfully', data).send(response);
});

export const rejectBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.rejectBooking(
    request.user,
    request.validatedParams.bookingId,
    request.validatedBody.reason,
  );
  return new ApiResponse(200, 'Booking rejected successfully', data).send(response);
});

export const cancelProviderBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.cancelProviderBooking(
    request.user,
    request.validatedParams.bookingId,
    request.validatedBody.reason,
  );
  return new ApiResponse(200, 'Booking cancelled successfully', data).send(response);
});

export const completeBooking = asyncHandler(async (request, response) => {
  const data = await bookingService.completeBooking(request.user, request.validatedParams.bookingId);
  return new ApiResponse(200, 'Booking completed successfully', data).send(response);
});

export const listProviderCalendar = asyncHandler(async (request, response) => {
  const data = await bookingService.listProviderCalendar(request.user, request.validatedQuery);
  return new ApiResponse(200, 'Provider appointments retrieved successfully', data).send(response);
});
