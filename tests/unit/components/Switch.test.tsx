import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Switch } from '@/components/ui/Switch';

describe('Switch Component', () => {
  it('renders with label and initial checked state', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} label="Enable alarms" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Enable alarms')).toBeInTheDocument();
  });

  it('triggers onCheckedChange on click', () => {
    const handleToggle = vi.fn();
    render(<Switch checked={false} onCheckedChange={handleToggle} label="Dark Mode" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it('triggers onCheckedChange on keyboard Space and Enter', () => {
    const handleToggle = vi.fn();
    render(<Switch checked={false} onCheckedChange={handleToggle} />);
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: ' ' });
    expect(handleToggle).toHaveBeenCalledWith(true);

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it('does not toggle when disabled', () => {
    const handleToggle = vi.fn();
    render(<Switch checked={false} disabled onCheckedChange={handleToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleToggle).not.toHaveBeenCalled();
  });
});
