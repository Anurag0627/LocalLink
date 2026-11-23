import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/booking.service.js', () => ({
  acceptBooking: vi.fn(),
  cancelMyBooking: vi.fn(),
  completeBooking: vi.fn(),
  getMyBookingById: vi.fn(),
  getProviderBookingById: vi.fn(),
  rejectBooking: vi.fn(),
}));

import {
  acceptBooking,
  cancelMyBooking,
  completeBooking,
  getMyBookingById,
  getProviderBookingById,
} from '../services/booking.service.js';
import BookingDetailsPage from './BookingDetailsPage.jsx';

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const booking = {
  _id: 'booking-1',
  bookingNumber: 'LL-BOOKING-1',
  status: 'PENDING',
  scheduledDate: `${tomorrow}T00:00:00.000Z`,
  scheduledTime: '09:00',
  duration: 60,
  serviceSnapshot: { title: 'Home cleaning', pricingType: 'FIXED', price: 85 },
  address: {
    label: 'Home',
    fullAddress: '10 Main Street',
    city: 'Springfield',
    state: 'CA',
    postalCode: '90210',
    country: 'USA',
  },
  customerNote: 'Please ring the side doorbell.',
  createdAt: '2026-11-23T08:00:00.000Z',
};

function response(data) {
  return { data: { data } };
}

function renderDetails(role = 'CUSTOMER') {
  return render(
    <MemoryRouter initialEntries={['/customer/bookings/booking-1']}>
      <Routes>
        <Route
          path="/customer/bookings/:bookingId"
          element={<BookingDetailsPage role={role} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BookingDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyBookingById.mockResolvedValue(response(booking));
    getProviderBookingById.mockResolvedValue(response(booking));
    cancelMyBooking.mockResolvedValue(response({ ...booking, status: 'CANCELLED' }));
    acceptBooking.mockResolvedValue(response({ ...booking, status: 'ACCEPTED' }));
    completeBooking.mockResolvedValue(response({ ...booking, status: 'COMPLETED' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('presents the appointment, location, notes, and customer action in clear sections', async () => {
    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Home cleaning' })).toBeInTheDocument();
    expect(screen.getByText('LL-BOOKING-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appointment summary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Service location' })).toBeInTheDocument();
    expect(screen.getByText('10 Main Street')).toBeInTheDocument();
    expect(screen.getByText('Please ring the side doorbell.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Booking timeline' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cancellation reason')).toBeInTheDocument();
  });

  it('keeps customer cancellation available and updates status after success', async () => {
    const user = userEvent.setup();
    renderDetails();

    await user.type(await screen.findByLabelText('Cancellation reason'), 'Schedule changed');
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    expect(window.confirm).toHaveBeenCalledWith('Cancel this booking?');
    expect(cancelMyBooking).toHaveBeenCalledWith('booking-1', 'Schedule changed');
    await waitFor(() => expect(screen.getByText('Cancelled')).toBeInTheDocument());
  });

  it('keeps provider accept action available for pending bookings', async () => {
    const user = userEvent.setup();
    renderDetails('PROVIDER');

    await user.click(await screen.findByRole('button', { name: 'Accept booking' }));

    expect(window.confirm).toHaveBeenCalledWith('Accept this booking?');
    expect(acceptBooking).toHaveBeenCalledWith('booking-1');
    await waitFor(() => expect(screen.getByText('Accepted')).toBeInTheDocument());
    expect(getProviderBookingById).toHaveBeenCalledWith('booking-1');
    expect(getMyBookingById).not.toHaveBeenCalled();
  });

  it('prevents completing an accepted booking before its scheduled end', async () => {
    getProviderBookingById.mockResolvedValue(response({ ...booking, status: 'ACCEPTED' }));
    renderDetails('PROVIDER');

    expect(await screen.findByRole('button', { name: 'Mark completed' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Completion will be available after the scheduled appointment end time.',
    );
    expect(completeBooking).not.toHaveBeenCalled();
  });

  it('allows completing an accepted booking after its scheduled end', async () => {
    const user = userEvent.setup();
    getProviderBookingById.mockResolvedValue(response({
      ...booking,
      status: 'ACCEPTED',
      scheduledDate: `${yesterday}T00:00:00.000Z`,
    }));
    renderDetails('PROVIDER');

    const completeButton = await screen.findByRole('button', { name: 'Mark completed' });
    await waitFor(() => expect(completeButton).toBeEnabled());
    await user.click(completeButton);

    expect(completeBooking).toHaveBeenCalledWith('booking-1');
    await waitFor(() => expect(screen.getByText('Completed')).toBeInTheDocument());
  });
});
