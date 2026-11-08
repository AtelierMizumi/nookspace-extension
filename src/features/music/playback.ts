export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Determine the next track id in a play order.
 * - `ended=false` (user pressed Next): always move forward, wrapping at the end.
 * - `ended=true` (track finished): repeat 'all' wraps; 'off' stops at last track;
 *   'one' stays on the current track for replay.
 * Null entry / unknown id starts from the first entry.
 */
export function nextInOrder(
  ids: string[],
  currentId: string | null,
  repeatMode: RepeatMode,
  ended: boolean
): string | null {
  if (!ids || ids.length === 0) return null;
  const idx = currentId ? ids.indexOf(currentId) : -1;
  if (idx === -1) return ids[0] ?? null;
  if (ended && repeatMode === 'one') return currentId;
  if (idx < ids.length - 1) return ids[idx + 1];
  // At the end of the order
  if (ended && repeatMode !== 'all') return null;
  return ids[0] ?? null;
}

/**
 * Determine the previous track id, always wrapping.
 * Null / unknown current selects the last entry; empty order returns null.
 */
export function prevInOrder(ids: string[], currentId: string | null): string | null {
  if (!ids || ids.length === 0) return null;
  const idx = currentId ? ids.indexOf(currentId) : -1;
  if (idx === -1) return ids[ids.length - 1] ?? null;
  return ids[(idx - 1 + ids.length) % ids.length];
}

/** Fisher–Yates shuffle on a copy. `random` is injectable for tests. */
export function shuffledIds(ids: string[], random: () => number = Math.random): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type QueueSource = 'osu' | 'local';

export interface UnifiedMusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  source: QueueSource;
}

export interface BundledTrackInput {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
}

export interface LocalTrackInput {
  id: string;
  name: string;
  artist?: string;
  duration?: number;
}

/**
 * Merge bundled (osu) tracks then local device tracks into one playable
 * queue with source-prefixed ids so collisions across origins never clash.
 */
export function buildQueue(
  bundled: BundledTrackInput[],
  local: LocalTrackInput[]
): UnifiedMusicTrack[] {
  const osu = (bundled || []).map((t) => ({
    id: `osu=${t.id}`,
    title: t.title,
    artist: t.artist,
    duration: t.duration,
    source: 'osu' as const,
  }));
  const dev = (local || []).map((t) => ({
    id: `local=${t.id}`,
    title: t.name,
    artist: t.artist,
    duration: t.duration,
    source: 'local' as const,
  }));
  return [...osu, ...dev];
}
