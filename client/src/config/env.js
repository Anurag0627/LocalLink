const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export function getApiBaseUrl() {
  if (!rawBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required. Set it in client/.env.local.',
    );
  }

  try {
    const url = new URL(rawBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid HTTP or HTTPS URL.');
  }

  return rawBaseUrl.replace(/\/+$/, '');
}
