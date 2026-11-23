import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('submits service image URLs using the backend images array', async () => {
    const user = userEvent.setup();
    const categoryId = '507f1f77bcf86cd799439011';
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    getActiveCategories.mockResolvedValue({
      data: { data: [{ _id: categoryId, name: 'Home care' }] },
    });

    render(
      <MemoryRouter>
        <ServiceForm submitLabel="Create service" onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText('Service title'), 'Home cleaning');
    await user.selectOptions(screen.getByLabelText('Category'), categoryId);
    await user.type(screen.getByLabelText('Description'), 'Home cleaning service');
    await user.type(screen.getByLabelText('Service image URLs (one per line, optional)'), 'https://images.example.com/cleaning.jpg');
    await user.type(screen.getByLabelText('Price'), '75');
    await user.click(screen.getByRole('button', { name: 'Create service' }));

    expect(await screen.findByLabelText('Service image URLs (one per line, optional)')).toHaveValue(
      'https://images.example.com/cleaning.jpg',
    );
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      images: ['https://images.example.com/cleaning.jpg'],
    }));
  });

  it('prepopulates existing image URLs when editing a service', async () => {
    const imageUrls = [
      'https://images.example.com/cleaning.jpg',
      'https://images.example.com/cleaning-detail.jpg',
    ];
    getActiveCategories.mockResolvedValue({
      data: { data: [{ _id: '507f1f77bcf86cd799439011', name: 'Home care' }] },
    });

    render(
      <MemoryRouter>
        <ServiceForm
          initialData={{
            category: { _id: '507f1f77bcf86cd799439011' },
            title: 'Home cleaning',
            description: 'Home cleaning service',
            images: imageUrls,
            pricingType: 'FIXED',
            price: 75,
            serviceLocationType: 'AT_CUSTOMER_LOCATION',
          }}
          submitLabel="Save changes"
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Service image URLs (one per line, optional)')).toHaveValue(
      imageUrls.join('\n'),
    );
  });
});
