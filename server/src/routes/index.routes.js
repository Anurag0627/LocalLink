import { Router } from 'express';
import accountRoutes from './account.routes.js';
import authRoutes from './auth.routes.js';
import customerProfileRoutes from './customerProfile.routes.js';
import healthRoutes, { legacyHealthRoutes } from './health.routes.js';
import providerProfileRoutes from './providerProfile.routes.js';
import categoryRoutes from './category.routes.js';
import serviceRoutes from './service.routes.js';
import discoveryRoutes from './discovery.routes.js';
import bookingRoutes from './booking.routes.js';
import providerBookingRoutes from './providerBooking.routes.js';
import reviewRoutes from './review.routes.js';
import reviewModerationRoutes from './reviewModeration.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';

const apiRoutes = Router();
const legacyApiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/customers', customerProfileRoutes);
apiRoutes.use('/providers', providerProfileRoutes);
apiRoutes.use('/account', accountRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/services', serviceRoutes);
apiRoutes.use('/discovery', discoveryRoutes);
apiRoutes.use('/bookings', bookingRoutes);
apiRoutes.use('/provider/bookings', providerBookingRoutes);
apiRoutes.use('/reviews', reviewRoutes);
apiRoutes.use('/admin', reviewModerationRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/notifications', notificationRoutes);
legacyApiRoutes.use('/health', legacyHealthRoutes);

export { legacyApiRoutes };
export default apiRoutes;
