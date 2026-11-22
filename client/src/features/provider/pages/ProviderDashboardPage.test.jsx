import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProviderDashboardPage from './ProviderDashboardPage.jsx';

vi.mock('../services/provider.service.js', () => ({
  getProviderProfile: vi.fn(),
  getProviderServices: vi.fn(),
}));

import { getProviderProfile, getProviderServices } from '../services/provider.service.js';

describe('ProviderDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('loads actual profile and service metrics', async () => {
    getProviderProfile.mockResolvedValue({
      data: { data: { user: { firstName: 'Alex' }, profile: { businessName: 'Bright Pros', verificationStatus: 'VERIFIED', description: 'Electrical services', averageRating: 4.8, totalReviews: 12 } } },
    });
    getProviderServices.mockResolvedValue({
      data: { data: [{ _id: '1', isActive: true }, { _id: '2', isActive: false }], meta: { total: 2 } },
    });
    render(<MemoryRouter><ProviderDashboardPage /></MemoryRouter>);
    expect(await screen.findByText('Bright Pros')).toBeInTheDocument();
    expect(screen.getByText('Active services').previousElementSibling?.textContent).toBeDefined();
  });

  it('displays provider API failures', async () => {
    getProviderProfile.mockRejectedValue({ status: 0, message: 'Unable to connect' });
    getProviderServices.mockResolvedValue({ data: { data: [], meta: {} } });
    render(<MemoryRouter><ProviderDashboardPage /></MemoryRouter>);
    expect(await screen.findByText("We couldn't load this information")).toBeInTheDocument();
  });

  it('shows an empty service metric state without fabricated counts', async () => {
    getProviderProfile.mockResolvedValue({
      data: { data: { profile: { businessName: 'New Provider', verificationStatus: 'PENDING' } } },
    });
    getProviderServices.mockResolvedValue({
      data: { data: [], meta: { total: 0 } },
    });
    render(<MemoryRouter><ProviderDashboardPage /></MemoryRouter>);
    expect(await screen.findByText('Verification pending')).toBeInTheDocument();
  });
});
