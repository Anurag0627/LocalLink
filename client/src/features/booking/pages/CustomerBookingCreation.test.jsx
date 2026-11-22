import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreateBookingPage from './CreateBookingPage.jsx';

vi.mock('../../customer/services/customer.service.js', () => ({
  getServiceById: vi.fn(),
}));

vi.mock('../services/booking.service.js', () => ({
  createBooking: vi.fn(),
  getCustomerAddresses: vi.fn(),
}));

import { getServiceById } from '../../customer/services/customer.service.js';
import { createBooking, getCustomerAddresses } from '../services/booking.service.js';

describe('CreateBookingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServiceById.mockResolvedValue({
      data: {
        data: {
          service: {
            _id: 'service-1',
            title: 'Home Repair',
            pricingType: 'FIXED',
            price: 80,
            serviceLocationType: 'AT_CUSTOMER_LOCATION',
            availability: [],
          },
          provider: { businessName: 'Reliable Pros' },
          category: { name: 'Home Services' },
        },
      },
    });
  });
  afterEach(() => cleanup());

  it('loads service and saved address information', async () => {
    getCustomerAddresses.mockResolvedValue({
      data: { data: { addresses: [{ _id: 'address-1', fullAddress: '10 Main St', city: 'Test City', state: 'TS', postalCode: '11111' }] } },
    });
    render(
      <MemoryRouter initialEntries={['/customer/services/service-1/book']}>
        <Routes><Route path="/customer/services/:serviceId/book" element={<CreateBookingPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Home Repair')).toBeInTheDocument();
    expect(screen.getByText(/10 Main St/)).toBeInTheDocument();
  });

  it('requires a saved address for customer-location services', async () => {
    getCustomerAddresses.mockResolvedValue({ data: { data: { addresses: [] } } });
    render(
      <MemoryRouter initialEntries={['/customer/services/service-1/book']}>
        <Routes><Route path="/customer/services/:serviceId/book" element={<CreateBookingPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Home Repair');
    await userEvent.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByText('A saved address is required for this service.')).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('handles a scheduling conflict from the backend', async () => {
    getCustomerAddresses.mockResolvedValue({
      data: { data: { addresses: [{ _id: 'address-1', fullAddress: '10 Main St', city: 'Test City', state: 'TS', postalCode: '11111' }] } },
    });
    createBooking.mockRejectedValue({ status: 409, message: 'The appointment conflicts with an existing booking' });
    render(
      <MemoryRouter initialEntries={['/customer/services/service-1/book']}>
        <Routes><Route path="/customer/services/:serviceId/book" element={<CreateBookingPage />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Home Repair');
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await userEvent.type(screen.getByLabelText('Appointment date'), date);
    await userEvent.type(screen.getByLabelText('Start time'), '10:00');
    await userEvent.selectOptions(screen.getByLabelText('Saved address'), 'address-1');
    await userEvent.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByText('The appointment conflicts with an existing booking')).toBeInTheDocument();
  });
});
