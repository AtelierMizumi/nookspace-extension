import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/services/database/db';
import {
  AudioTrackRepository,
  MAX_AUDIO_FILE_SIZE_BYTES,
  canBrowserPlayMimeType,
} from '../../../src/services/database/repositories/audioTrackRepository';

describe('AudioTrackRepository & Local Audio Persistence', () => {
  let repository: AudioTrackRepository;

  beforeEach(async () => {
    repository = new AudioTrackRepository(db);
    await db.audioTracks.clear();
  });

  it('1. validates valid audio files with supported extensions and MIME types', async () => {
    const validFile = new File(['dummy audio content'], 'chill_vibes.mp3', {
      type: 'audio/mpeg',
    });

    const res = await repository.validateAudioFile(validFile);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('2. rejects empty files (0 bytes)', async () => {
    const emptyFile = new File([], 'empty.mp3', { type: 'audio/mpeg' });
    const res = await repository.validateAudioFile(emptyFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('empty');
  });

  it('3. rejects files exceeding 100MB limit', async () => {
    // Create mock file with size property mocked
    const largeFile = new File(['x'], 'huge.wav', { type: 'audio/wav' });
    Object.defineProperty(largeFile, 'size', {
      value: MAX_AUDIO_FILE_SIZE_BYTES + 1024,
      writable: false,
    });

    const res = await repository.validateAudioFile(largeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds 100MB limit');
  });

  it('4. rejects pure video files', async () => {
    const videoFile = new File(['fake video'], 'music_video.mp4', {
      type: 'video/mp4',
    });

    const res = await repository.validateAudioFile(videoFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Video files are not supported');
  });

  it('5. rejects unsupported document or executable files', async () => {
    const exeFile = new File(['malicious'], 'song.exe', {
      type: 'application/x-msdownload',
    });

    const res = await repository.validateAudioFile(exeFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported audio format');
  });

  it('6. imports multiple valid audio files and stores Blob in IndexedDB', async () => {
    const file1 = new File(['audio content 1'], 'track_one.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['audio content 2'], 'track_two.wav', { type: 'audio/wav' });

    const importResult = await repository.importAudioFiles([file1, file2]);
    expect(importResult.success).toBe(true);
    expect(importResult.imported.length).toBe(2);
    expect(importResult.errors.length).toBe(0);

    // Verify persisted in Dexie
    const allTracks = await repository.getAllTracks();
    expect(allTracks.length).toBe(2);
    expect(allTracks[0].name).toBe('track_one');
    expect(allTracks[1].name).toBe('track_two');
    expect(allTracks[0].blob).toBeDefined();
    expect(allTracks[0].order).toBe(0);
    expect(allTracks[1].order).toBe(1);
  });

  it('7. retrieves track by ID and deletes track cleanly', async () => {
    const file = new File(['audio stream'], 'lofi_study.flac', { type: 'audio/flac' });
    const importResult = await repository.importAudioFiles([file]);
    const trackId = importResult.imported[0].id;

    const fetched = await repository.getTrackById(trackId);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('lofi_study');
    expect(fetched?.mimeType).toBe('audio/flac');

    // Delete
    const deleteSuccess = await repository.deleteTrack(trackId);
    expect(deleteSuccess).toBe(true);

    const afterDelete = await repository.getTrackById(trackId);
    expect(afterDelete).toBeUndefined();
  });

  it('8. updates track metadata (e.g. lastPlayedAt)', async () => {
    const file = new File(['audio stream'], 'lofi_night.ogg', { type: 'audio/ogg' });
    const importResult = await repository.importAudioFiles([file]);
    const trackId = importResult.imported[0].id;

    const now = Date.now();
    await repository.updateTrackMetadata(trackId, {
      name: 'Midnight Lofi',
      artist: 'Sleepy Beats',
      lastPlayedAt: now,
    });

    const updated = await repository.getTrackById(trackId);
    expect(updated?.name).toBe('Midnight Lofi');
    expect(updated?.artist).toBe('Sleepy Beats');
    expect(updated?.lastPlayedAt).toBe(now);
  });

  it('9. reorders tracks deterministically', async () => {
    const file1 = new File(['1'], 'first.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['2'], 'second.mp3', { type: 'audio/mpeg' });
    const importResult = await repository.importAudioFiles([file1, file2]);

    const id1 = importResult.imported[0].id;
    const id2 = importResult.imported[1].id;

    // Swap order: [id2, id1]
    await repository.reorderTracks([id2, id1]);

    const reordered = await repository.getAllTracks();
    expect(reordered[0].id).toBe(id2);
    expect(reordered[1].id).toBe(id1);
  });

  it('10. handles empty file selection gracefully', async () => {
    const result = await repository.importAudioFiles([]);
    expect(result.success).toBe(false);
    expect(result.imported.length).toBe(0);
    expect(result.errors).toContain('No files selected.');
  });
});
