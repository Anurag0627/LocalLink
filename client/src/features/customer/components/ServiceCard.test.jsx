import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ServiceCard from './ServiceCard.jsx';

describe('ServiceCard', () => {
  it('renders actual service and provider information', () => {
    render(
      <MemoryRouter>
        <ServiceCard
          service={{
            _id: 'service-1',
            title: 'Home Electrical Repair',
            description: 'Safe and reliable electrical repairs.',
            category: { name: 'Electrical' },
            provider: { _id: 'provider-1', businessName: 'Bright Pros' },
            pricingType: 'HOURLY',
            price: 45,
            averageRating: 4.8,
            totalReviews: 12,
            serviceLocationType: 'AT_CUSTOMER_LOCATION',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Home Electrical Repair')).toBeInTheDocument();
    expect(screen.getByText('Bright Pros')).toBeInTheDocument();
    expect(screen.getByText('$45/hour')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/services/service-1');
  });

  it('displays the service image and falls back when the URL cannot load', () => {
    render(
      <MemoryRouter>
        <ServiceCard
          service={{
            _id: 'service-2',
            title: 'Home Cleaning',
            description: 'Home cleaning service',
            images: ['https://images.example.com/cleaning.jpg'],
            pricingType: 'FIXED',
            price: 75,
          }}
        />
      </MemoryRouter>,
    );

    const image = screen.getByRole('img', { name: 'Home Cleaning service' });
    expect(image).toHaveAttribute('src', 'https://images.example.com/cleaning.jpg');
    fireEvent.error(image);
    expect(screen.queryByRole('img', { name: 'Home Cleaning service' })).not.toBeInTheDocument();
  });
});
