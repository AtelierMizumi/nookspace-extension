import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MusicWidgetComponent,
  MusicWidgetSettings,
  DEFAULT_MUSIC_CONFIG,
  formatTime,
} from '../../../src/widgets/MusicWidget';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';
import { db } from '../../../src/services/database/db';
import { audioTrackRepository } from '../../../src/services/database/repositories/audioTrackRepository';

describe('MusicWidget Component & Settings (Local Audio Player)', () => {
  beforeEach(async () => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
    vi.restoreAllMocks();
    await db.audioTracks.clear();

    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(function (this: HTMLMediaElement) {
      // Simulate native 'playing' event
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    });

    // Mock URL.createObjectURL and revokeObjectURL
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-audio-uuid');
    } else {
      vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-audio-uuid');
    }

    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  afterEach(async () => {
    await db.audioTracks.clear();
  });

  it('1. formatTime formats seconds correctly into mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(-10)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('2. renders default Music Player widget elements without any YouTube dependency', async () => {
    const onUpdateConfig = vi.fn();

    render(
      <MusicWidgetComponent
        instanceId="inst-music-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={DEFAULT_MUSIC_CONFIG}
        onUpdateConfig={onUpdateConfig}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Music Player')).toBeInTheDocument();
    expect(screen.getByText('Device Audio')).toBeInTheDocument();
    expect(screen.getByText('No audio tracks yet')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();

    // Verify NO YouTube elements or IFrames exist
    expect(screen.queryByTitle(/youtube/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/youtube/i)).not.toBeInTheDocument();
  });

  it('3. renders animated vinyl record with paused state initially and running state when playing', async () => {
    // Seed one audio track
    const testFile = new File(['mock audio'], 'lofi_study.mp3', { type: 'audio/mpeg' });
    await audioTrackRepository.importAudioFiles([testFile]);
    const tracks = await audioTrackRepository.getAllTracks();

    const onUpdateConfig = vi.fn();

    render(
      <MusicWidgetComponent
        instanceId="inst-music-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ ...DEFAULT_MUSIC_CONFIG, activeTrackId: tracks[0].id }}
        onUpdateConfig={onUpdateConfig}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('lofi_study')).toBeInTheDocument();
    });

    const vinylDisc = screen.getByTestId('vinyl-disc');
    expect(vinylDisc).toBeInTheDocument();
    expect(vinylDisc).toHaveStyle({ animationPlayState: 'paused' });

    // Click to Play
    fireEvent.click(vinylDisc);

    await waitFor(() => {
      expect(vinylDisc).toHaveStyle({ animationPlayState: 'running' });
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // Click to Pause
    const pauseBtn = screen.getByText('Pause');
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(vinylDisc).toHaveStyle({ animationPlayState: 'paused' });
      expect(screen.getByText('Play')).toBeInTheDocument();
    });
  });

  it('4. navigates next and previous tracks in the local playlist', async () => {
    const file1 = new File(['audio 1'], 'track_alpha.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['audio 2'], 'track_beta.mp3', { type: 'audio/mpeg' });
    await audioTrackRepository.importAudioFiles([file1, file2]);
    const tracks = await audioTrackRepository.getAllTracks();

    const onUpdateConfig = vi.fn();

    render(
      <MusicWidgetComponent
        instanceId="inst-music-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ ...DEFAULT_MUSIC_CONFIG, activeTrackId: tracks[0].id }}
        onUpdateConfig={onUpdateConfig}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('track_alpha')).toBeInTheDocument();
    });

    // Click Next
    const nextBtn = screen.getByLabelText('Next');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('track_beta')).toBeInTheDocument();
      expect(onUpdateConfig).toHaveBeenCalledWith(
        expect.objectContaining({ activeTrackId: tracks[1].id })
      );
    });

    // Click Previous
    const prevBtn = screen.getByLabelText('Previous');
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(screen.getByText('track_alpha')).toBeInTheDocument();
    });
  });

  it('5. controls volume and mute state', async () => {
    const onUpdateConfig = vi.fn();

    render(
      <MusicWidgetComponent
        instanceId="inst-music-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={DEFAULT_MUSIC_CONFIG}
        onUpdateConfig={onUpdateConfig}
        onRemove={vi.fn()}
      />
    );

    const volumeSlider = screen.getByLabelText('Volume');
    expect(volumeSlider).toBeInTheDocument();

    fireEvent.change(volumeSlider, { target: { value: '50' } });

    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ volume: 50 })
    );

    // Mute toggle
    const muteBtn = screen.getByLabelText('Mute');
    fireEvent.click(muteBtn);

    expect(screen.getByLabelText('Unmute')).toBeInTheDocument();
  });

  it('6. Settings modal displays music library and allows importing audio files', async () => {
    const onSaveConfig = vi.fn();
    const onClose = vi.fn();

    render(
      <MusicWidgetSettings
        config={DEFAULT_MUSIC_CONFIG}
        onSaveConfig={onSaveConfig}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Music Library')).toBeInTheDocument();
    expect(screen.getByText('0 tracks')).toBeInTheDocument();

    // Trigger file import via file input
    const file = new File(['dummy audio content'], 'morning_coffee.mp3', {
      type: 'audio/mpeg',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('morning_coffee')).toBeInTheDocument();
      expect(screen.getByText('1 tracks')).toBeInTheDocument();
    });

    // Save
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('7. cleans up object URLs on unmount to prevent memory leaks', async () => {
    const file = new File(['audio'], 'sunset.mp3', { type: 'audio/mpeg' });
    await audioTrackRepository.importAudioFiles([file]);
    const tracks = await audioTrackRepository.getAllTracks();

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const { unmount } = render(
      <MusicWidgetComponent
        instanceId="inst-music-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{ ...DEFAULT_MUSIC_CONFIG, activeTrackId: tracks[0].id }}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('sunset')).toBeInTheDocument();
    });

    unmount();

    expect(revokeSpy).toHaveBeenCalled();
  });
});
