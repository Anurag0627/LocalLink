export const bookingStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export function formatDate(value) {
  if (!value) return 'Not specified';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(value) {
  if (!value) return 'Not specified';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function priceLabel(snapshot) {
  if (snapshot?.pricingType === 'QUOTE') return 'Quote required';
  if (typeof snapshot?.price !== 'number') return 'Price unavailable';
  const suffix = snapshot.pricingType === 'HOURLY' ? '/hour' : '';
  const prefix = snapshot.pricingType === 'STARTING_FROM' ? 'Starting at ' : '';
  return `${prefix}$${snapshot.price.toLocaleString()}${suffix}`;
}
