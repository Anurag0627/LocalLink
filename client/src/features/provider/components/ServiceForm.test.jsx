import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ServiceForm from './ServiceForm.jsx';

vi.mock('../services/provider.service.js', () => ({
  getActiveCategories: vi.fn(),
  getProviderProfile: vi.fn(),
}));

import { getActiveCategories, getProviderProfile } from '../services/provider.service.js';

describe('ServiceForm category selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveCategories.mockResolvedValue({ data: { data: [] } });
    getProviderProfile.mockResolvedValue({ data: { data: { profile: { verificationStatus: 'VERIFIED' } } } });
  });

  afterEach(() => cleanup());

  it('explains when no active categories exist and prevents submitting without one', async () => {
    render(
      <MemoryRouter>
        <ServiceForm submitLabel="Create service" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No active categories are available/)).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create service' })).toBeDisabled();
  });
});
