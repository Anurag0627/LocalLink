import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatTime,
  priceLabel,
} from './booking.utils.js';

describe('booking.utils', () => {
  it('formats calendar dates consistently without timezone displacement', () => {
    expect(formatDate(null)).toBe('Not specified');
    expect(formatDate('')).toBe('Not specified');
    expect(formatDate('invalid')).toBe('Not specified');

    // Calendar date formatted consistently with UTC calendar date
    const formattedFromIso = formatDate('2026-12-05T00:00:00.000Z');
    expect(formattedFromIso).toContain('2026');
    expect(formattedFromIso).toContain('Dec');
    expect(formattedFromIso).toContain('5');

    const formattedFromYmd = formatDate('2026-12-05');
    expect(formattedFromYmd).toContain('2026');
    expect(formattedFromYmd).toContain('Dec');
    expect(formattedFromYmd).toContain('5');
  });

  it('formats appointment time correctly', () => {
    expect(formatTime(null)).toBe('Not specified');
    expect(formatTime('14:30')).toContain('2:30');
    expect(formatTime('09:05')).toContain('9:05');
  });

  it('generates clear price labels for all pricing types', () => {
    expect(priceLabel({ pricingType: 'QUOTE' })).toBe('Quote required');
    expect(priceLabel({ pricingType: 'FIXED', price: 120 })).toBe('$120');
    expect(priceLabel({ pricingType: 'HOURLY', price: 45 })).toBe('$45/hour');
    expect(priceLabel({ pricingType: 'STARTING_FROM', price: 80 })).toBe('Starting at $80');
    expect(priceLabel(null)).toBe('Price unavailable');
  });
});
