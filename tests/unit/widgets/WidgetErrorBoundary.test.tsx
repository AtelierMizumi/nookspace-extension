import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WidgetErrorBoundary } from '@/features/widget-system/WidgetErrorBoundary';

const FaultyComponent: React.FC = () => {
  throw new Error('Simulation of widget runtime crash');
};

describe('WidgetErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <WidgetErrorBoundary widgetType="healthy-widget">
        <div>Safe Widget Content</div>
      </WidgetErrorBoundary>
    );
    expect(screen.getByText('Safe Widget Content')).toBeInTheDocument();
  });

  it('catches runtime error and displays isolated fallback card', () => {
    // Suppress console.error in test output for clean logs
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WidgetErrorBoundary widgetType="faulty-widget">
        <FaultyComponent />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText(/Widget Error \(faulty-widget\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulation of widget runtime crash/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload widget/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
