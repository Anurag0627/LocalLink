import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProviderDetailsPage from './ProviderDetailsPage.jsx';

vi.mock('../services/customer.service.js', () => ({
  getProviderById: vi.fn(),
  getProviderServices: vi.fn(),
  getProviderReviews: vi.fn(),
}));

import {
  getProviderById,
  getProviderServices,
  getProviderReviews,
} from '../services/customer.service.js';

function renderPage(providerId = 'provider-123') {
  return render(
    <MemoryRouter initialEntries={[`/providers/${providerId}`]}>
      <Routes>
        <Route path="/providers/:providerId" element={<ProviderDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProviderDetailsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getProviderById.mockResolvedValue({
      data: {
        data: {
          _id: 'provider-123',
          businessName: 'Bright Pros',
          description: 'Reliable local electrical work',
          averageRating: 4.8,
          totalReviews: 12,
          verificationStatus: 'VERIFIED',
          serviceAreas: [{ city: 'Test City', state: 'TS' }],
        },
      },
    });
    getProviderReviews.mockResolvedValue({ data: { data: [] } });
  });

  it('loads a provider directly from the URL', async () => {
    getProviderServices.mockResolvedValue({
      data: { data: [], meta: { page: 1, totalPages: 0 } },
    });

    renderPage();

    expect(await screen.findByText('Bright Pros')).toBeInTheDocument();
    expect(getProviderById).toHaveBeenCalledWith('provider-123');
  });

  it('renders an empty provider services state', async () => {
    getProviderServices.mockResolvedValue({
      data: { data: [], meta: { page: 1, totalPages: 0 } },
    });

    renderPage();

    expect(await screen.findByText('This provider has no publicly available services.')).toBeInTheDocument();
  });

  it('shows a provider profile API failure', async () => {
    getProviderById.mockRejectedValue({ status: 0, message: 'Unable to connect' });
    getProviderServices.mockResolvedValue({ data: { data: [], meta: {} } });

    renderPage();

    expect(await screen.findByText("We couldn't load this information")).toBeInTheDocument();
    expect(screen.getByText('Unable to connect')).toBeInTheDocument();
  });

  it('shows a not-found state for an unavailable provider', async () => {
    getProviderById.mockRejectedValue({ status: 404, message: 'Provider not found' });
    getProviderServices.mockResolvedValue({ data: { data: [], meta: {} } });

    renderPage();

    expect(await screen.findByText('This provider is unavailable or could not be found.')).toBeInTheDocument();
  });

  it('supports browser-refresh style direct navigation', async () => {
    getProviderServices.mockResolvedValue({
      data: { data: [], meta: { page: 1, totalPages: 0 } },
    });

    renderPage('refreshed-provider');

    expect(await screen.findByText('Bright Pros')).toBeInTheDocument();
    expect(getProviderById).toHaveBeenCalledWith('refreshed-provider');
  });
});
