#!/usr/bin/env node
/**
 * NookSpace — build bundled osu! playlist
 *
 * Scans the osu! Songs folder for mp3 files longer than 70 seconds,
 * keeps the first 100 (stable order by relative path), copies them into
 * public/music/ and writes public/music/playlist.json consumed at runtime
 * by src/features/music/bundledPlaylist.ts.
 *
 * Usage: npm run music
 * Env overrides:
 *   OSU_SONGS_DIR   (default: /mnt/SSDStorage/osu!/Songs)
 *   MUSIC_OUT_DIR   (default: public/music)
 *   MUSIC_LIMIT     (default: 100)
 *   MUSIC_MIN_DURATION (default: 70)
 *
 * The mp3 files are gitignored (public/music/*.mp3) — regenerate with
 * `npm run music` on any machine that has the songs folder.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, stat, cp, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

const DEFAULT_SONGS_DIR = '/mnt/SSDStorage/osu!/Songs';

/** Keep only letters, digits, dot, underscore; collapse runs of `_`. */
export function sanitizeFileName(name) {
  const src = String(name || '');
  const dotIdx = src.lastIndexOf('.');
  const stem = dotIdx > 0 ? src.slice(0, dotIdx) : src;
  const ext = dotIdx > 0 ? src.slice(dotIdx) : '';
  const cleanStem = stem.replace(/[^A-Za-z0-9._]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const cleanExt = ext.replace(/[^A-Za-z0-9.]/g, '').toLowerCase();
  return (cleanStem || 'track') + cleanExt;
}

/**
 * Parse an osu! song folder name like "1000852 Roselia - MIIRO" into
 * artist/title. Numeric-only folders fall back to the raw folder name.
 */
export function parseOsuDirName(dirBase) {
  const raw = String(dirBase || '').trim();
  const cleaned = raw.replace(/^\d+\s+/, '').trim() || raw;
  const idx = cleaned.indexOf(' - ');
  if (idx > 0) {
    const artist = cleaned.slice(0, idx).trim();
    const title = cleaned.slice(idx + 3).trim();
    if (title) return { artist, title };
  }
  return { title: cleaned || raw || 'Unknown' };
}

/**
 * Filter files strictly longer than minDuration, sort stably by relative
 * path, cap at limit, and assign collision-free output file names.
 * Input items: { src, rel, duration, size }.
 */
export function selectTracks(files, { minDuration = 70, limit = 100 } = {}) {
  const valid = (files || [])
    .filter((f) => Number.isFinite(f.duration) && f.duration > minDuration)
    .sort((a, b) => String(a.rel).localeCompare(String(b.rel), 'en', { sensitivity: 'base' }));
  return valid.slice(0, limit).map((f, i) => {
    const base = sanitizeFileName(String(f.rel).split('/').pop());
    return { ...f, destName: `${String(i + 1).padStart(3, '0')}_${base}` };
  });
}

async function findMp3Files(rootDir) {
  const results = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && /\.mp3$/i.test(entry.name)) {
        results.push(full);
      }
    }
  }
  await walk(rootDir);
  return results;
}

async function probeDuration(file) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'json',
      file,
    ]);
    const parsed = JSON.parse(stdout);
    const seconds = Number(parsed?.format?.duration);
    return Number.isFinite(seconds) ? seconds : NaN;
  } catch {
    return NaN;
  }
}

/** Simple concurrency pool preserving input order. */
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runner());
  await Promise.all(workers);
  return results;
}

export async function buildPlaylist({ songsDir = DEFAULT_SONGS_DIR, outDir, limit = 100, minDuration = 70 } = {}) {
  const files = await findMp3Files(songsDir);
  if (files.length === 0) {
    throw new Error(`No .mp3 files found under ${songsDir}`);
  }
  const probed = await mapPool(files, 8, async (file) => {
    const [duration, st] = await Promise.all([probeDuration(file), stat(file)]);
    return { src: file, rel: relative(songsDir, file), duration, size: st.size };
  });
  const selected = selectTracks(probed, { minDuration, limit });
  if (selected.length === 0) {
    throw new Error(`No mp3 files longer than ${minDuration}s under ${songsDir}`);
  }
  const out = outDir || join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'music');
  await mkdir(out, { recursive: true });
  const tracks = [];
  let totalBytes = 0;
  for (const item of selected) {
    const dest = join(out, item.destName);
    await cp(item.src, dest);
    totalBytes += item.size;
    const folder = dirname(item.rel).split('/');
    const info = parseOsuDirName(folder[0] || '');
    const baseName = String(item.rel).split('/').pop().replace(/\.mp3$/i, '');
    tracks.push({
      id: item.destName,
      title: info.title || baseName,
      artist: info.artist,
      file: item.destName,
      duration: Math.round(item.duration),
      size: item.size,
    });
  }
  const playlist = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: songsDir,
    minDuration,
    count: tracks.length,
    totalMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
    tracks,
  };
  await writeFile(join(out, 'playlist.json'), JSON.stringify(playlist, null, 2) + '\n');
  return playlist;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const result = await buildPlaylist({
      songsDir: process.env.OSU_SONGS_DIR || DEFAULT_SONGS_DIR,
      outDir: process.env.MUSIC_OUT_DIR,
      limit: Number(process.env.MUSIC_LIMIT || 100),
      minDuration: Number(process.env.MUSIC_MIN_DURATION || 70),
    });
    console.log(`Bundled ${result.count} tracks (${result.totalMB} MB) → public/music/playlist.json`);
  } catch (err) {
    console.error(`build-osu-playlist failed: ${err.message}`);
    process.exit(1);
  }
}
