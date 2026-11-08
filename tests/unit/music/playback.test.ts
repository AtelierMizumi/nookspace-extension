import { describe, it, expect } from 'vitest';
import {
  nextInOrder,
  prevInOrder,
  shuffledIds,
  buildQueue,
} from '../../../src/features/music/playback';

const IDS = ['a', 'b', 'c'];

describe('playback next/prev/repeat order logic', () => {
  it('next moves forward and wraps around at the end (user pressed next)', () => {
    expect(nextInOrder(IDS, 'a', 'off', false)).toBe('b');
    expect(nextInOrder(IDS, 'c', 'off', false)).toBe('a');
  });

  it('next on track-end with repeat=all wraps; with repeat=off stops at end', () => {
    expect(nextInOrder(IDS, 'c', 'all', true)).toBe('a');
    expect(nextInOrder(IDS, 'c', 'off', true)).toBeNull();
    expect(nextInOrder(IDS, 'a', 'off', true)).toBe('b');
  });

  it('next on track-end with repeat=one stays on the same track', () => {
    expect(nextInOrder(IDS, 'b', 'one', true)).toBe('b');
  });

  it('next with empty order or unknown current returns first or null safely', () => {
    expect(nextInOrder([], 'a', 'all', false)).toBeNull();
    // unknown current → start at first element
    expect(nextInOrder(IDS, null, 'all', false)).toBe('a');
    expect(nextInOrder(IDS, 'zzz', 'all', false)).toBe('a');
  });

  it('prev moves backward and wraps', () => {
    expect(prevInOrder(IDS, 'b')).toBe('a');
    expect(prevInOrder(IDS, 'a')).toBe('c');
    expect(prevInOrder([], 'a')).toBeNull();
  });

  it('shuffledIds returns a permutation without duplicates, deterministic with injected random', () => {
    const seq = [0.1, 0.9, 0.3, 0.7];
    let i = 0;
    const random = () => seq[i++ % seq.length];
    const out = shuffledIds(IDS, random);
    expect([...out].sort()).toEqual(['a', 'b', 'c']);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    // Empty input is safe
    expect(shuffledIds([], random)).toEqual([]);
  });

  it('buildQueue merges osu tracks first, then local tracks, with unique prefixed ids', () => {
    const queue = buildQueue(
      [
        { id: '1', title: 'osu one', artist: 'Alias A', duration: 95 },
        { id: '2', title: 'osu two', duration: 120 },
      ],
      [{ id: 'x', name: 'local beat', artist: 'Me', duration: 200 }]
    );
    expect(queue).toHaveLength(3);
    expect(queue[0]).toEqual(
      expect.objectContaining({ source: 'osu', title: 'osu one', artist: 'Alias A', duration: 95 })
    );
    expect(queue[1].source).toBe('osu');
    expect(queue[2]).toEqual(
      expect.objectContaining({ source: 'local', title: 'local beat', artist: 'Me', duration: 200 })
    );
    expect(new Set(queue.map((q) => q.id)).size).toBe(3);
  });
});
