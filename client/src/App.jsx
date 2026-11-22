import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import RoleLayout from './layouts/RoleLayout.jsx';
import BecomeProviderPage from './pages/BecomeProviderPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AccessDeniedPage from './pages/AccessDeniedPage.jsx';
import RoleLandingPage from './pages/RoleLandingPage.jsx';
import { ProtectedRoute, PublicRoute } from './routes/RouteGuards.jsx';
import CustomerHomePage from './features/customer/pages/CustomerHomePage.jsx';
import ServiceDiscoveryPage from './features/customer/pages/ServiceDiscoveryPage.jsx';
import ServiceDetailsPage from './features/customer/pages/ServiceDetailsPage.jsx';
import ProviderDetailsPage from './features/customer/pages/ProviderDetailsPage.jsx';
import CategoryServicesPage from './features/customer/pages/CategoryServicesPage.jsx';
import ProviderLayout from './features/provider/components/ProviderLayout.jsx';
import ProviderDashboardPage from './features/provider/pages/ProviderDashboardPage.jsx';
import ProviderProfilePage from './features/provider/pages/ProviderProfilePage.jsx';
import ProviderServicesPage from './features/provider/pages/ProviderServicesPage.jsx';
import CreateServicePage from './features/provider/pages/CreateServicePage.jsx';
import EditServicePage from './features/provider/pages/EditServicePage.jsx';
import ProviderAvailabilityPage from './features/provider/pages/ProviderAvailabilityPage.jsx';
import ProviderServiceAreasPage from './features/provider/pages/ProviderServiceAreasPage.jsx';
import CreateBookingPage from './features/booking/pages/CreateBookingPage.jsx';
import CustomerBookingsPage from './features/booking/pages/CustomerBookingsPage.jsx';
import BookingDetailsPage from './features/booking/pages/BookingDetailsPage.jsx';
import ProviderBookingsPage from './features/booking/pages/ProviderBookingsPage.jsx';
import ProviderSchedulePage from './features/booking/pages/ProviderSchedulePage.jsx';
import CustomerReviewsPage from './features/reviews/pages/CustomerReviewsPage.jsx';
import WriteReviewPage from './features/reviews/pages/WriteReviewPage.jsx';
import EditReviewPage from './features/reviews/pages/EditReviewPage.jsx';
import ProviderReviewsPage from './features/reviews/pages/ProviderReviewsPage.jsx';
import NotificationsPage from './features/notifications/pages/NotificationsPage.jsx';
import NotificationPreferencesPage from './features/notifications/pages/NotificationPreferencesPage.jsx';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServiceDiscoveryPage />} />
        <Route path="discover" element={<ServiceDiscoveryPage />} />
        <Route path="services/:serviceId" element={<ServiceDetailsPage />} />
        <Route path="categories" element={<ServiceDiscoveryPage />} />
        <Route path="categories/:categoryId" element={<CategoryServicesPage />} />
        <Route path="providers/:providerId" element={<ProviderDetailsPage />} />
        <Route path="become-a-provider" element={<BecomeProviderPage />} />
        <Route element={<PublicRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/:role" element={<RegisterPage />} />
        </Route>
        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route element={<ProtectedRoute roles={['CUSTOMER', 'PROVIDER']} />}>
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notifications/preferences" element={<NotificationPreferencesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
        <Route element={<RoleLayout role="CUSTOMER" title="Customer" />}>
          <Route path="customer" element={<CustomerHomePage />} />
          <Route path="customer/services" element={<ServiceDiscoveryPage />} />
          <Route path="customer/services/:serviceId" element={<ServiceDetailsPage />} />
          <Route path="customer/categories/:categoryId" element={<CategoryServicesPage />} />
          <Route path="customer/providers/:providerId" element={<ProviderDetailsPage />} />
          <Route path="customer/services/:serviceId/book" element={<CreateBookingPage />} />
          <Route path="customer/bookings" element={<CustomerBookingsPage />} />
          <Route path="customer/bookings/:bookingId" element={<BookingDetailsPage role="CUSTOMER" />} />
          <Route path="customer/bookings/:bookingId/review" element={<WriteReviewPage />} />
          <Route path="customer/reviews" element={<CustomerReviewsPage />} />
          <Route path="customer/reviews/:reviewId/edit" element={<EditReviewPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['PROVIDER']} />}>
        <Route element={<ProviderLayout />}>
          <Route path="provider" element={<ProviderDashboardPage />} />
          <Route path="provider/profile" element={<ProviderProfilePage />} />
          <Route path="provider/services" element={<ProviderServicesPage />} />
          <Route path="provider/services/new" element={<CreateServicePage />} />
          <Route path="provider/services/:serviceId/edit" element={<EditServicePage />} />
          <Route path="provider/availability" element={<ProviderAvailabilityPage />} />
          <Route path="provider/service-areas" element={<ProviderServiceAreasPage />} />
          <Route path="provider/bookings" element={<ProviderBookingsPage />} />
          <Route path="provider/bookings/:bookingId" element={<BookingDetailsPage role="PROVIDER" />} />
          <Route path="provider/schedule" element={<ProviderSchedulePage />} />
          <Route path="provider/reviews" element={<ProviderReviewsPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<RoleLayout role="ADMIN" title="Admin" />}>
          <Route path="admin" element={<RoleLandingPage role="ADMIN" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
