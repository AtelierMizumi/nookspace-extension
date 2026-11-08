import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSection } from '../../../src/features/preferences/components/LanguageSection';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';

describe('LanguageSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useLanguageStore.setState({
      language: 'en',
      isInitialized: true,
    });
  });

  it('1. renders language options for English and Tiếng Việt', () => {
    render(<LanguageSection />);

    expect(screen.getByTestId('language-section')).toBeInTheDocument();
    expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
    expect(screen.getByTestId('language-option-vi')).toBeInTheDocument();
  });

  it('2. highlights active language (English by default)', () => {
    render(<LanguageSection />);

    const optEn = screen.getByTestId('language-option-en');
    const optVi = screen.getByTestId('language-option-vi');

    expect(optEn).toHaveAttribute('aria-checked', 'true');
    expect(optVi).toHaveAttribute('aria-checked', 'false');
  });

  it('3. switches language immediately to Vietnamese on click', async () => {
    render(<LanguageSection />);

    const optVi = screen.getByTestId('language-option-vi');
    fireEvent.click(optVi);

    await waitFor(() => {
      expect(useLanguageStore.getState().language).toBe('vi');
    });

    expect(optVi).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('language-option-en')).toHaveAttribute('aria-checked', 'false');
  });

  it('4. keyboard navigation switches language on Enter or Space', async () => {
    render(<LanguageSection />);

    const optVi = screen.getByTestId('language-option-vi');
    fireEvent.keyDown(optVi, { key: 'Enter' });

    await waitFor(() => {
      expect(useLanguageStore.getState().language).toBe('vi');
    });
  });
});
