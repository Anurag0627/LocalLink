import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  bookingIdSchema,
  bookingListQuerySchema,
  cancelBookingSchema,
  createBookingSchema,
} from '../validators/booking.validator.js';

const bookingRoutes = Router();

bookingRoutes.use(authenticate, authorizeRoles('CUSTOMER'));
bookingRoutes.post('/', validate(createBookingSchema), bookingController.createBooking);
bookingRoutes.get('/my', validate(bookingListQuerySchema, 'query'), bookingController.listCustomerBookings);
bookingRoutes.get('/:bookingId', validate(bookingIdSchema, 'params'), bookingController.getCustomerBooking);
bookingRoutes.patch('/:bookingId/cancel', validate(bookingIdSchema, 'params'), validate(cancelBookingSchema), bookingController.cancelCustomerBooking);

export default bookingRoutes;
