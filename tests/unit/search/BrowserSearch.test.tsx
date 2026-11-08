import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserSearch } from '../../../src/features/search/BrowserSearch';
import { useSettingsStore } from '../../../src/stores/settingsStore';

describe('BrowserSearch Component', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        id: 'current_settings',
        theme: 'dark',
        accentColor: '#6366f1',
        fontFamily: 'Inter',
        fontSize: 'md',
        backgroundType: 'color',
        backgroundValue: '#09090b',
        widgetOpacity: 90,
        widgetBlur: 10,
        activeWorkspaceId: 'ws-default-personal',
        language: 'en',
        searchEngine: 'google',
        startupBehavior: 'new-tab-only',
        startupSetupStatus: 'not-configured',
        updatedAt: Date.now(),
      },
    });
  });

  it('1. renders search input with clear placeholder and default provider', () => {
    render(<BrowserSearch />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('2. typing in input shows clear button and clicking it resets the input', () => {
    render(<BrowserSearch />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'vitest testing' } });

    expect(input.value).toBe('vitest testing');

    const clearBtn = screen.getByLabelText(/clear/i);
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(input.value).toBe('');
  });

  it('3. pressing Escape clears the search query', () => {
    render(<BrowserSearch />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'react state' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
  });

  it('4. submitting a search query triggers onNavigate callback with formatted URL', () => {
    const onNavigate = vi.fn();
    render(<BrowserSearch onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i);
    fireEvent.change(input, { target: { value: 'taylor swift eras tour' } });
    fireEvent.submit(input.closest('form')!);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/search?q=taylor+swift+eras+tour')
    );
  });

  it('5. submitting a direct URL navigates to the URL directly without search query wrapper', () => {
    const onNavigate = vi.fn();
    render(<BrowserSearch onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i);
    fireEvent.change(input, { target: { value: 'github.com' } });
    fireEvent.submit(input.closest('form')!);

    expect(onNavigate).toHaveBeenCalledWith('https://github.com/');
  });

  it('6. toggling engine dropdown allows switching active search provider', async () => {
    render(<BrowserSearch />);

    const engineBtn = screen.getByRole('button', { name: /switch search engine: google/i });
    fireEvent.click(engineBtn);

    // DuckDuckGo option should be visible in dropdown
    const ddgOption = screen.getByRole('button', { name: /duckduckgo/i });
    fireEvent.click(ddgOption);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.searchEngine).toBe('duckduckgo');
    });
  });

  it('7. responds to / keyboard shortcut to focus input', () => {
    render(<BrowserSearch />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i);
    const focusSpy = vi.spyOn(input, 'focus');

    fireEvent.keyDown(window, { key: '/' });
    expect(focusSpy).toHaveBeenCalled();
  });

  it('8. responds to Ctrl+K shortcut to focus input', () => {
    render(<BrowserSearch />);

    const input = screen.getByPlaceholderText(/search or enter a website address/i);
    const focusSpy = vi.spyOn(input, 'focus');

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(focusSpy).toHaveBeenCalled();
  });
});
