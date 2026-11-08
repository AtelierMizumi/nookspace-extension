import { describe, it, expect } from 'vitest';
import { parseMusicUrl, MUSIC_PRESETS } from '../../../src/features/music/musicUtils';

describe('Music Utilities & Allowlist Parser', () => {
  it('1. correctly parses YouTube watch URLs', () => {
    const res = parseMusicUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
    expect(res).not.toBeNull();
    expect(res?.provider).toBe('youtube');
    expect(res?.embedUrl).toBe('https://www.youtube.com/embed/jfKfPfyJRdk');
  });

  it('2. correctly parses youtu.be short links', () => {
    const res = parseMusicUrl('https://youtu.be/jfKfPfyJRdk');
    expect(res).not.toBeNull();
    expect(res?.provider).toBe('youtube');
    expect(res?.embedUrl).toBe('https://www.youtube.com/embed/jfKfPfyJRdk');
  });

  it('3. correctly parses YouTube embed URLs', () => {
    const res = parseMusicUrl('https://www.youtube-nocookie.com/embed/jfKfPfyJRdk');
    expect(res).not.toBeNull();
    expect(res?.provider).toBe('youtube');
    expect(res?.embedUrl).toBe('https://www.youtube.com/embed/jfKfPfyJRdk');
  });

  it('4. correctly parses Spotify track URLs', () => {
    const res = parseMusicUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
    expect(res).not.toBeNull();
    expect(res?.provider).toBe('spotify');
    expect(res?.embedUrl).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
  });

  it('5. correctly parses Spotify playlist and album URLs', () => {
    const playlistRes = parseMusicUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(playlistRes).not.toBeNull();
    expect(playlistRes?.provider).toBe('spotify');
    expect(playlistRes?.embedUrl).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');

    const albumRes = parseMusicUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3');
    expect(albumRes).not.toBeNull();
    expect(albumRes?.provider).toBe('spotify');
    expect(albumRes?.embedUrl).toBe('https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3');
  });

  it('6. correctly parses SoundCloud URLs', () => {
    const res = parseMusicUrl('https://soundcloud.com/chilledcow/lofi-hip-hop');
    expect(res).not.toBeNull();
    expect(res?.provider).toBe('soundcloud');
    expect(res?.embedUrl).toContain('https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fchilledcow%2Flofi-hip-hop');
  });

  it('7. correctly parses direct audio streams (MP3, OGG, WAV)', () => {
    const mp3Res = parseMusicUrl('https://example.com/audio/focus-beat.mp3');
    expect(mp3Res).not.toBeNull();
    expect(mp3Res?.provider).toBe('audio');
    expect(mp3Res?.embedUrl).toBe('https://example.com/audio/focus-beat.mp3');

    const streamRes = parseMusicUrl('https://streams.ilovemusic.de/iloveradio17.mp3');
    expect(streamRes).not.toBeNull();
    expect(streamRes?.provider).toBe('audio');
  });

  it('7. strictly rejects malicious schemes (javascript:, data:, file:) and arbitrary domains', () => {
    expect(parseMusicUrl('javascript:alert(1)')).toBeNull();
    expect(parseMusicUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(parseMusicUrl('file:///C:/Windows/System32/cmd.exe')).toBeNull();
    expect(parseMusicUrl('https://evil-phishing-site.com/track')).toBeNull();
    expect(parseMusicUrl('https://example.com')).toBeNull();
    expect(parseMusicUrl('not a url at all')).toBeNull();
    expect(parseMusicUrl('')).toBeNull();
  });

  it('8. verifies all built-in curated presets are valid and parsable', () => {
    expect(MUSIC_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of MUSIC_PRESETS) {
      const parsed = parseMusicUrl(preset.url);
      expect(parsed).not.toBeNull();
      expect(parsed?.provider).toBe(preset.provider);
      expect(parsed?.embedUrl).toBe(preset.embedUrl);
    }
  });
});
