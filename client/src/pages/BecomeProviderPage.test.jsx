import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BecomeProviderPage from './BecomeProviderPage.jsx';

vi.mock('../features/auth/context/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../features/auth/context/useAuth.js';

describe('BecomeProviderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('renders provider value proposition and registration CTA for visitors', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null });
    render(
      <MemoryRouter>
        <BecomeProviderPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /become a locallink provider/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register as a provider/i })).toHaveAttribute('href', '/register/provider');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('renders dashboard link when logged in as a provider', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'PROVIDER' } });
    render(
      <MemoryRouter>
        <BecomeProviderPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /go to provider dashboard/i })).toHaveAttribute('href', '/provider');
  });
});
