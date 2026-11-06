import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Input } from '@/components/ui/Input';

describe('Input Component', () => {
  it('renders input field with placeholder', () => {
    render(<Input placeholder="Enter title" />);
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type here" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Type here');
    fireEvent.change(input, { target: { value: 'New Task' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error text when provided', () => {
    render(<Input placeholder="Title" error="Field required" />);
    expect(screen.getByText('Field required')).toBeInTheDocument();
  });

  it('respects disabled state', () => {
    render(<Input placeholder="Disabled" disabled />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });
});
