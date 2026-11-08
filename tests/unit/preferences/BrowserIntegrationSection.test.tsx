import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserIntegrationSection } from '../../../src/features/preferences/components/BrowserIntegrationSection';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';
import * as browserDetection from '../../../src/services/browser/browserDetection';

describe('BrowserIntegrationSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(browserDetection, 'detectBrowserFamily').mockReturnValue('chrome');
    useLanguageStore.setState({ language: 'en', isInitialized: true });
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
        activeWorkspaceId: 'ws-default',
        startupBehavior: 'new-tab-only',
        startupSetupStatus: 'not-configured',
        updatedAt: Date.now(),
      },
      detectedBrowser: 'chrome',
      isLoading: false,
      error: null,
    });
  });

  it('1. renders Browser Integration section and New Tab Override status as Active', () => {
    render(<BrowserIntegrationSection />);

    expect(screen.getByTestId('browser-integration-section')).toBeInTheDocument();
    expect(screen.getByText('Browser Integration')).toBeInTheDocument();
    expect(screen.getByText('New Tab Override')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('2. displays all 4 startup behavior options with Option 1 selected by default', () => {
    render(<BrowserIntegrationSection />);

    const opt1 = screen.getByTestId('option-new-tab-only');
    const opt2 = screen.getByTestId('option-browser-startup');
    const opt3 = screen.getByTestId('option-both');
    const opt4 = screen.getByTestId('option-keep-browser-defaults');

    expect(opt1).toBeInTheDocument();
    expect(opt2).toBeInTheDocument();
    expect(opt3).toBeInTheDocument();
    expect(opt4).toBeInTheDocument();

    expect(opt1).toHaveAttribute('aria-checked', 'true');
    expect(opt2).toHaveAttribute('aria-checked', 'false');
    expect(opt3).toHaveAttribute('aria-checked', 'false');
    expect(opt4).toHaveAttribute('aria-checked', 'false');

    // Guided setup panel is hidden when new-tab-only
    expect(screen.queryByTestId('guided-setup-panel')).not.toBeInTheDocument();
  });

  it('3. reveals guided setup experience when Option 2 (Browser Startup) is selected', async () => {
    render(<BrowserIntegrationSection />);

    const opt2 = screen.getByTestId('option-browser-startup');
    fireEvent.click(opt2);

    await waitFor(() => {
      expect(screen.getByTestId('guided-setup-panel')).toBeInTheDocument();
    });

    expect(screen.getByText(/Guided Setup for Google Chrome/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Manual Setup/i)).toBeInTheDocument();
    expect(screen.getByTestId('extension-url-input')).toBeInTheDocument();
    expect(screen.getByTestId('copy-url-btn')).toBeInTheDocument();
    expect(screen.getByTestId('open-settings-btn')).toBeInTheDocument();
  });

  it('4. reveals guided setup experience when Option 3 (Both) is selected', async () => {
    render(<BrowserIntegrationSection />);

    const opt3 = screen.getByTestId('option-both');
    fireEvent.click(opt3);

    await waitFor(() => {
      expect(screen.getByTestId('guided-setup-panel')).toBeInTheDocument();
    });

    expect(screen.getByText(/Guided Setup for Google Chrome/i)).toBeInTheDocument();
  });

  it('5. copies extension URL to clipboard when Copy URL button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        startupBehavior: 'browser-startup',
      },
    });

    render(<BrowserIntegrationSection />);

    const copyBtn = screen.getByTestId('copy-url-btn');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('6. handles blocked browser settings navigation gracefully and displays notice', async () => {
    vi.spyOn(browserDetection, 'openBrowserSettingsPage').mockResolvedValueOnce({
      success: false,
      blockedBySecurity: true,
      error: 'Cannot navigate to chrome:// URL',
    });

    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        startupBehavior: 'browser-startup',
      },
    });

    render(<BrowserIntegrationSection />);

    const openBtn = screen.getByTestId('open-settings-btn');
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByTestId('settings-blocked-notice')).toBeInTheDocument();
      expect(screen.getByText(/Due to browser security policies/i)).toBeInTheDocument();
    });
  });

  it('7. toggles manual verification checkbox to mark setup as Verified', async () => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        startupBehavior: 'browser-startup',
        startupSetupStatus: 'manual-verification-required',
      },
    });

    render(<BrowserIntegrationSection />);

    const checkbox = screen.getByTestId('verify-setup-checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('8. displays Zen Browser specific note when Zen is detected', () => {
    vi.spyOn(browserDetection, 'detectBrowserFamily').mockReturnValue('zen');
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        startupBehavior: 'browser-startup',
      },
      detectedBrowser: 'zen',
    });

    render(<BrowserIntegrationSection />);

    expect(screen.getByTestId('zen-troubleshooting-note')).toBeInTheDocument();
    expect(screen.getByText(/Zen Browser Note:/i)).toBeInTheDocument();
  });

  it('9. updates state and hides guided panel when Option 4 is selected', async () => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        startupBehavior: 'browser-startup',
      },
    });

    render(<BrowserIntegrationSection />);
    expect(screen.getByTestId('guided-setup-panel')).toBeInTheDocument();

    const opt4 = screen.getByTestId('option-keep-browser-defaults');
    fireEvent.click(opt4);

    await waitFor(() => {
      expect(opt4).toHaveAttribute('aria-checked', 'true');
      expect(screen.queryByTestId('guided-setup-panel')).not.toBeInTheDocument();
    });
  });
});
