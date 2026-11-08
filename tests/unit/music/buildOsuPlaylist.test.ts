import { describe, it, expect } from 'vitest';
import {
  selectTracks,
  sanitizeFileName,
  parseOsuDirName,
} from '../../../scripts/build-osu-playlist.mjs';

function make(rel: string, duration: number) {
  return { src: `/osu/${rel}`, rel, duration, size: 1024 };
}

describe('build-osu-playlist selection logic', () => {
  it('filters strictly longer than minDuration, sorts stably, and limits count', () => {
    const all = [
      make('b/60.mp3', 60), // < 70 excluded
      make('a/exactly70.mp3', 70), // not strictly longer → excluded
      make('c/just-over.mp3', 71), // included
      make('d/long.mp3', 300),
      make('a/first.mp3', 95),
    ];
    const selected = selectTracks(all);
    expect(selected.map((t) => t.rel)).toEqual(['a/first.mp3', 'c/just-over.mp3', 'd/long.mp3']);
  });

  it('honours custom limit and minDuration', () => {
    const all = [make('a.mp3', 80), make('b.mp3', 90), make('c.mp3', 100)];
    expect(selectTracks(all, { minDuration: 90, limit: 1 }).map((t) => t.rel)).toEqual(['c.mp3']);
    expect(selectTracks(all, { minDuration: 0, limit: 2 })).toHaveLength(2);
  });

  it('deduplicates colliding output file names', () => {
    const all = [make('one/audio.mp3', 100), make('two/audio.mp3', 100), make('three/audio.mp3', 100)];
    const selected = selectTracks(all);
    const destNames = selected.map((t) => t.destName);
    expect(new Set(destNames).size).toBe(3);
  });

  it('sanitizeFileName strips unsafe characters and keeps extension', () => {
    expect(sanitizeFileName('Roselia - MIIRO.mp3')).toBe('Roselia_MIIRO.mp3');
    expect(sanitizeFileName('weird/name\\test?.mp3')).toBe('weird_name_test.mp3');
    expect(sanitizeFileName('noext')).toBe('noext');
  });

  it('parseOsuDirName splits "artist - title" folders, falls back to numerics', () => {
    expect(parseOsuDirName('1000852 Roselia - MIIRO')).toEqual({ artist: 'Roselia', title: 'MIIRO' });
    expect(parseOsuDirName('100348')).toEqual({ title: '100348' });
    expect(parseOsuDirName('SoloSong')).toEqual({ title: 'SoloSong' });
  });
});
