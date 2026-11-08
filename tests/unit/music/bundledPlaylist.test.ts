import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadBundledPlaylist } from '../../../src/features/music/bundledPlaylist';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bundled playlist loader (WXT public/music)', () => {
  it('returns parsed tracks when playlist.json is valid', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: '1', title: 'osu one', artist: 'Alias', file: '001_osu_one.mp3', duration: 95 },
            { id: '2', title: 'osu two', file: '002_osu_two.mp3' },
          ]),
          { status: 200 }
        )
      );
    const tracks = await loadBundledPlaylist();
    expect(fetchSpy).toHaveBeenCalledWith('music/playlist.json');
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toEqual(
      expect.objectContaining({ id: '1', title: 'osu one', artist: 'Alias', file: '001_osu_one.mp3', duration: 95 })
    );
  });

  it('filters out entries missing a file path and trims strings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: '1', title: 'ok', file: 'a.mp3' },
          { id: '2', title: 'no file' },
          { id: '3', title: '  ', file: ' ' },
          'bogus',
        ]),
        { status: 200 }
      )
    );
    const tracks = await loadBundledPlaylist();
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('1');
  });

  it('returns empty array on missing file, non-OK status, or invalid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('not found', { status: 404 }));
    expect(await loadBundledPlaylist()).toEqual([]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('garbage{', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    expect(await loadBundledPlaylist()).toEqual([]);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network down'));
    expect(await loadBundledPlaylist()).toEqual([]);
  });

  it('parses the REAL generated playlist.json shape (object with tracks key)', async () => {
    const { parseBundledPlaylist } = await import('../../../src/features/music/bundledPlaylist');
    // Mirrors scripts/build-osu-playlist.mjs output exactly:
    // { version, generatedAt, source, minDuration, count, totalMB, tracks: [...] }
    const payload = {
      version: 1,
      generatedAt: '2026-11-08T19:00:14.220Z',
      source: '/mnt/SSDStorage/osu!/Songs',
      minDuration: 70,
      count: 2,
      totalMB: 9.4,
      tracks: [
        { id: '001_audio.mp3', title: 'MIIRO', artist: 'Roselia', file: '001_audio.mp3', duration: 92, size: 2213377 },
        { id: '002_audio.mp3', title: 'Flames Within These Black Feathers', artist: 'Foreground Eclipse', file: '002_audio.mp3', duration: 227, size: 5445719 },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    const tracks = await loadBundledPlaylist();
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toEqual(
      expect.objectContaining({ id: '001_audio.mp3', title: 'MIIRO', artist: 'Roselia', duration: 92 })
    );
    // Direct parser entrypoint also accepts the object shape
    expect(parseBundledPlaylist(payload)).toHaveLength(2);
  });

  it('parses the ACTUAL generated public/music/playlist.json on disk (integration)', async () => {
    const { parseBundledPlaylist } = await import('../../../src/features/music/bundledPlaylist');
    const { existsSync, readFileSync } = await import('node:fs');
    const path = 'public/music/playlist.json';
    if (!existsSync(path)) {
      // Fresh clone without `npm run music` — nothing to verify.
      expect(true).toBe(true);
      return;
    }
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    const tracks = parseBundledPlaylist(raw);
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.length).toBe(raw.tracks.length);
    expect(tracks[0]).toEqual(expect.objectContaining({ title: expect.any(String), file: expect.any(String) }));
  });
});
