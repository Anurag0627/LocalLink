export function roleLandingPath(role) {
  if (role === 'PROVIDER') return '/provider';
  if (role === 'ADMIN') return '/admin';
  return '/customer';
}
