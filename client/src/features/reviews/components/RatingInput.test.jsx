import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RatingInput from './RatingInput.jsx';

describe('RatingInput', () => {
  afterEach(() => cleanup());

  it('supports accessible 1-5 star selection', async () => {
    const onChange = vi.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '5 stars: Excellent' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
