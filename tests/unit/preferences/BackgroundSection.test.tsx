import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackgroundSection } from '../../../src/features/preferences/components/BackgroundSection';
import { useSettingsStore } from '../../../src/stores/settingsStore';

describe('BackgroundSection Preferences Component', () => {
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
        backgroundMode: 'cover',
        backgroundOverlay: 50,
        widgetOpacity: 90,
        widgetBlur: 10,
        activeWorkspaceId: 'ws-default-personal',
        language: 'en',
        searchEngine: 'google',
        startupBehavior: 'new-tab-only',
        startupSetupStatus: 'not-configured',
        updatedAt: Date.now(),
      },
      customBackgroundUrl: null,
    });
  });

  it('1. renders header, tabs, and display mode controls', () => {
    render(<BackgroundSection />);

    expect(screen.getByText('Custom Background')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('Image URL')).toBeInTheDocument();
    expect(screen.getByText('Display Mode')).toBeInTheDocument();
    expect(screen.getByText('Dark Overlay')).toBeInTheDocument();
  });

  it('2. switches between Upload Image and Image URL tabs', () => {
    render(<BackgroundSection />);

    // Initially in upload tab
    expect(screen.getByText('Choose an image from your device')).toBeInTheDocument();

    // Click Image URL tab
    const urlTabBtn = screen.getByRole('button', { name: /image url/i });
    fireEvent.click(urlTabBtn);

    expect(screen.getByPlaceholderText(/https:\/\/images\.unsplash\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
  });

  it('3. selecting a display mode updates settings store', async () => {
    render(<BackgroundSection />);

    const containBtn = screen.getByRole('button', { name: /contain/i });
    fireEvent.click(containBtn);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.backgroundMode).toBe('contain');
    });
  });

  it('4. selecting an overlay intensity updates settings store', async () => {
    render(<BackgroundSection />);

    const overlay75Btn = screen.getByRole('button', { name: '75%' });
    fireEvent.click(overlay75Btn);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.backgroundOverlay).toBe(75);
    });
  });

  it('5. shows restore default button when custom background is active and clears it on click', async () => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings!,
        backgroundType: 'image',
        backgroundValue: 'https://example.com/wallpaper.jpg',
      },
    });

    render(<BackgroundSection />);

    const restoreBtn = screen.getByRole('button', { name: /restore default background/i });
    expect(restoreBtn).toBeInTheDocument();

    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(useSettingsStore.getState().settings?.backgroundType).toBe('color');
    });
  });
});
