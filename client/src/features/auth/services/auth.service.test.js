import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

import api, { setAccessToken } from '../../../lib/api.js';
import * as authService from './auth.service.js';

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores the access token returned by login', async () => {
    api.post.mockResolvedValue({
      data: { data: { accessToken: 'access-1', user: { _id: '1', role: 'CUSTOMER' } } },
    });
    const user = await authService.login({ email: 'ada@example.com', password: 'long-password-1' });
    expect(setAccessToken).toHaveBeenCalledWith('access-1');
    expect(user.role).toBe('CUSTOMER');
  });

  it('uses the me endpoint for session user data', async () => {
    api.get.mockResolvedValue({
      data: { data: { user: { _id: '1', role: 'PROVIDER' }, profile: {} } },
    });
    const user = await authService.getCurrentUser();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(user.role).toBe('PROVIDER');
  });

  it('refreshes and stores a new access token', async () => {
    api.post.mockResolvedValue({
      data: { data: { accessToken: 'access-2' } },
    });
    await authService.refreshSession();
    expect(api.post).toHaveBeenCalledWith('/auth/refresh');
    expect(setAccessToken).toHaveBeenCalledWith('access-2');
  });
});
