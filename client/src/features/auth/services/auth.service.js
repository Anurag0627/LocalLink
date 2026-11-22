import api, { clearAccessToken, setAccessToken } from '../../../lib/api.js';

function applySession(payload) {
  const data = payload?.data;
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data?.user ?? null;
}

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials);
  return applySession(response.data);
}

export async function registerCustomer(data) {
  const response = await api.post('/auth/register', {
    role: 'CUSTOMER',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    confirmPassword: data.confirmPassword,
  });
  return applySession(response.data);
}

export async function registerProvider(data) {
  const response = await api.post('/auth/register', {
    role: 'PROVIDER',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    confirmPassword: data.confirmPassword,
    businessName: data.businessName,
    description: data.description || undefined,
    experienceYears: data.experienceYears,
  });
  return applySession(response.data);
}

export async function refreshSession() {
  const response = await api.post('/auth/refresh');
  const accessToken = response.data?.data?.accessToken;
  if (!accessToken) throw new Error('Refresh response did not include an access token');
  setAccessToken(accessToken);
  return accessToken;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data?.data?.user ?? null;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
}

export async function logoutAll() {
  try {
    await api.post('/auth/logout-all');
  } finally {
    clearAccessToken();
  }
}
