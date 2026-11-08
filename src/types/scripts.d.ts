// Ambient types for the Node build script tests import (scripts/build-osu-playlist.mjs).
// Lets `npm run compile` type-check the tests without parsing the .mjs implementation.
declare module '*/build-osu-playlist.mjs' {
  export interface OsuFileCandidate {
    src: string;
    rel: string;
    duration: number;
    size: number;
    destName?: string;
    [key: string]: unknown;
  }

  export function sanitizeFileName(name: string): string;
  export function parseOsuDirName(dirBase: string): { artist?: string; title: string };
  export function selectTracks(
    files: OsuFileCandidate[],
    opts?: { minDuration?: number; limit?: number }
  ): OsuFileCandidate[];
}
