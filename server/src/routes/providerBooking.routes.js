import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  bookingIdSchema,
  bookingListQuerySchema,
  cancelBookingSchema,
  providerCalendarQuerySchema,
  rejectBookingSchema,
} from '../validators/booking.validator.js';

const providerBookingRoutes = Router();

providerBookingRoutes.use(authenticate, authorizeRoles('PROVIDER'));
providerBookingRoutes.get('/calendar', validate(providerCalendarQuerySchema, 'query'), bookingController.listProviderCalendar);
providerBookingRoutes.get('/', validate(bookingListQuerySchema, 'query'), bookingController.listProviderBookings);
providerBookingRoutes.get('/:bookingId', validate(bookingIdSchema, 'params'), bookingController.getProviderBooking);
providerBookingRoutes.patch('/:bookingId/accept', validate(bookingIdSchema, 'params'), bookingController.acceptBooking);
providerBookingRoutes.patch('/:bookingId/reject', validate(bookingIdSchema, 'params'), validate(rejectBookingSchema), bookingController.rejectBooking);
providerBookingRoutes.patch('/:bookingId/cancel', validate(bookingIdSchema, 'params'), validate(cancelBookingSchema), bookingController.cancelProviderBooking);
providerBookingRoutes.patch('/:bookingId/complete', validate(bookingIdSchema, 'params'), bookingController.completeBooking);

export default providerBookingRoutes;
