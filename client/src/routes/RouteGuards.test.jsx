import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';

vi.mock('../features/auth/context/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../features/auth/context/useAuth.js';
import { ProtectedRoute } from './RouteGuards.jsx';

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    useAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });
    render(
      <MemoryRouter initialEntries={['/customer']}>
        <Routes>
          <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
            <Route path="/customer" element={<div>Customer page</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('allows the matching role', () => {
    useAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { role: 'CUSTOMER' },
    });
    render(
      <MemoryRouter initialEntries={['/customer']}>
        <Routes>
          <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
            <Route path="/customer" element={<div>Customer page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Customer page')).toBeInTheDocument();
  });

  it('shows loading while session restoration is in progress', () => {
    useAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });
    render(
      <MemoryRouter>
        <ProtectedRoute roles={['CUSTOMER']} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading LocalLink...')).toBeInTheDocument();
  });

  it('does not allow customers to access provider routes', () => {
    useAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { role: 'CUSTOMER' },
    });
    render(
      <MemoryRouter initialEntries={['/provider']}>
        <Routes>
          <Route element={<ProtectedRoute roles={['PROVIDER']} />}>
            <Route path="/provider" element={<div>Provider page</div>} />
          </Route>
          <Route path="/access-denied" element={<div>Access denied</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });
});
