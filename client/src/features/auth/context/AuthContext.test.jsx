import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/auth.service.js', () => ({
  refreshSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock('../../../lib/api.js', () => ({
  clearAccessToken: vi.fn(),
}));

import * as authService from '../services/auth.service.js';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from './useAuth.js';

function AuthState() {
  const { isLoading, isAuthenticated } = useAuth();
  return <div>{isLoading ? 'Restoring session' : isAuthenticated ? 'Signed in' : 'Signed out'}</div>;
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finishes restoration under React StrictMode when no refresh session exists', async () => {
    authService.refreshSession.mockRejectedValue({ status: 401 });
    render(
      <StrictMode>
        <AuthProvider>
          <AuthState />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(authService.refreshSession).toHaveBeenCalledTimes(1);
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('restores a user and exits loading state', async () => {
    authService.refreshSession.mockResolvedValue('access-token');
    authService.getCurrentUser.mockResolvedValue({ role: 'CUSTOMER' });
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Signed in')).toBeInTheDocument());
  });
});
