import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Checkbox } from '@/components/ui/Checkbox';

describe('Checkbox Component', () => {
  it('renders checked state correctly', () => {
    render(<Checkbox checked={true} onCheckedChange={() => {}} label="Completed" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('triggers onCheckedChange when label or box is clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={handleChange} label="Focus Task" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('handles keyboard space key', () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={handleChange} />);
    const box = screen.getByRole('checkbox');
    fireEvent.keyDown(box, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
