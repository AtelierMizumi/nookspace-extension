import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchEngineSection } from '../../../src/features/preferences/components/SearchEngineSection';
import { useSettingsStore } from '../../../src/stores/settingsStore';

describe('SearchEngineSection Preferences Component', () => {
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

  it('1. renders header, description, and 3 supported search providers', () => {
    render(<SearchEngineSection />);

    expect(screen.getByText('Search Engine')).toBeInTheDocument();
    expect(screen.getAllByText('Google').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bing')).toBeInTheDocument();
    expect(screen.getByText('DuckDuckGo')).toBeInTheDocument();
  });

  it('2. marks Google as initially selected', () => {
    render(<SearchEngineSection />);

    const googleOption = screen.getByTestId('search-engine-option-google');
    expect(googleOption).toHaveAttribute('aria-checked', 'true');

    const bingOption = screen.getByTestId('search-engine-option-bing');
    expect(bingOption).toHaveAttribute('aria-checked', 'false');
  });

  it('3. clicking Bing updates settings store to bing', async () => {
    render(<SearchEngineSection />);

    const bingOption = screen.getByTestId('search-engine-option-bing');
    fireEvent.click(bingOption);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.searchEngine).toBe('bing');
    });
  });

  it('4. keyboard Enter key selects DuckDuckGo', async () => {
    render(<SearchEngineSection />);

    const ddgOption = screen.getByTestId('search-engine-option-duckduckgo');
    fireEvent.keyDown(ddgOption, { key: 'Enter' });

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.searchEngine).toBe('duckduckgo');
    });
  });
});
