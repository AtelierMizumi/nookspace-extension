export type MusicProvider = 'youtube' | 'spotify' | 'soundcloud' | 'audio';

export interface MusicPreset {
  id: string;
  name: string;
  artist: string;
  provider: MusicProvider;
  url: string;
  embedUrl: string;
  coverUrl?: string;
}

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'lofi-girl',
    name: 'Lofi Hip Hop Radio — Beats to Relax/Study',
    artist: 'Lofi Girl',
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'chillhop-study',
    name: 'Chillhop Radio — Jazzy & Lofi Beats',
    artist: 'Chillhop Music',
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
    embedUrl: 'https://www.youtube.com/embed/5yx6BWlEVcY',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'direct-lofi-stream',
    name: 'Lo-Fi Chill & Focus Stream',
    artist: 'Chill Audio Radio',
    provider: 'audio',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    embedUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'spotify-focus',
    name: 'Deep Focus & Ambient Study',
    artist: 'Spotify Chill',
    provider: 'spotify',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'soundcloud-ambient',
    name: 'Lo-Fi Chill Beats',
    artist: 'SoundCloud Chill',
    provider: 'soundcloud',
    url: 'https://soundcloud.com/chilledcow/sets/lofi-hip-hop-radio-beats-to',
    embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      'https://soundcloud.com/chilledcow/sets/lofi-hip-hop-radio-beats-to'
    )}&color=%236366f1&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
  },
];

export interface ParsedMusicUrlResult {
  provider: MusicProvider;
  embedUrl: string;
  cleanUrl: string;
  defaultTitle: string;
}

/**
 * Validates and parses user-entered music URLs against an allowlist of official embed platforms.
 * Rejects non-allowlisted domains and dangerous protocols.
 */
export function parseMusicUrl(input: string): ParsedMusicUrlResult | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Guard against malicious protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:')
  ) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
    );
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

  // 1. YouTube & YouTube Music
  if (
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'music.youtube.com' ||
    hostname === 'youtu.be' ||
    hostname === 'youtube-nocookie.com'
  ) {
    let videoId: string | null = null;
    const listId: string | null = parsed.searchParams.get('list');

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.replace('/embed/', '').split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.replace('/shorts/', '').split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/live/')) {
      videoId = parsed.pathname.replace('/live/', '').split('/')[0] || null;
    } else {
      videoId = parsed.searchParams.get('v');
    }

    if (listId && !videoId) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}`,
        cleanUrl: `https://www.youtube.com/playlist?list=${listId}`,
        defaultTitle: 'YouTube Playlist',
      };
    }

    if (videoId) {
      const embedUrl = listId
        ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?list=${encodeURIComponent(listId)}`
        : `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      return {
        provider: 'youtube',
        embedUrl,
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        defaultTitle: 'YouTube Track',
      };
    }
    return null;
  }

  // 2. Spotify
  if (hostname === 'open.spotify.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const type = parts[0];
      const id = parts[1];
      if (['track', 'playlist', 'album', 'artist'].includes(type)) {
        return {
          provider: 'spotify',
          embedUrl: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`,
          cleanUrl: `https://open.spotify.com/${type}/${id}`,
          defaultTitle: `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        };
      }
    }
    return null;
  }

  // 3. SoundCloud
  if (hostname === 'soundcloud.com' || hostname === 'on.soundcloud.com') {
    const soundcloudClean = `https://soundcloud.com${parsed.pathname}${parsed.search}`;
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      soundcloudClean
    )}&color=%236366f1&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
    return {
      provider: 'soundcloud',
      embedUrl,
      cleanUrl: soundcloudClean,
      defaultTitle: 'SoundCloud Track',
    };
  }

  // 4. Direct Audio File or Radio Stream (MP3, OGG, WAV, AAC, M4A, FLAC)
  const isAudioExt = /\.(mp3|ogg|wav|aac|m4a|flac)($|\?)/i.test(parsed.pathname);
  if (isAudioExt || parsed.pathname.includes('/stream') || parsed.pathname.includes('/radio')) {
    const filename = parsed.pathname.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Audio Stream';
    return {
      provider: 'audio',
      embedUrl: parsed.href,
      cleanUrl: parsed.href,
      defaultTitle: decodeURIComponent(filename) || 'Direct Audio Stream',
    };
  }

  return null;
}

const SPOTIFY_TYPES = ['track', 'playlist', 'album', 'artist', 'episode', 'show'];

/**
 * Accepts Spotify content given as a full URL, a `spotify:<type>:<id>` URI,
 * or a bare 22-character content id (treated as a track). Returns the same
 * embed shape as parseMusicUrl or null for anything unrecognized.
 */
export function parseSpotifyId(input: string): ParsedMusicUrlResult | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // spotify:<type>:<22-char id> URI
  if (trimmed.startsWith('spotify:')) {
    const parts = trimmed.slice('spotify:'.length).split(':');
    if (parts.length === 2 && SPOTIFY_TYPES.includes(parts[0]) && /^[A-Za-z0-9]{22}$/.test(parts[1])) {
      const [type, id] = parts;
      return {
        provider: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`,
        cleanUrl: `https://open.spotify.com/${type}/${id}`,
        defaultTitle: `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      };
    }
    return null;
  }

  // Full URL → reuse the allowlist parser, keeping only Spotify results
  const parsed = parseMusicUrl(trimmed);
  if (parsed && parsed.provider === 'spotify') return parsed;

  // Bare 22-char base62 id → track
  if (/^[A-Za-z0-9]{22}$/.test(trimmed)) {
    return {
      provider: 'spotify',
      embedUrl: `https://open.spotify.com/embed/track/${encodeURIComponent(trimmed)}`,
      cleanUrl: `https://open.spotify.com/track/${trimmed}`,
      defaultTitle: 'Spotify Track',
    };
  }
  return null;
}

/**
 * Attempts to automatically resolve track title and artist using oEmbed without requiring manual user input.
 */
export async function fetchTrackInfo(
  cleanUrl: string
): Promise<{ title: string; artist?: string } | null> {
  if (!cleanUrl || typeof cleanUrl !== 'string') return null;
  try {
    const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 3500) : null;
    const res = await fetch(oembedUrl, {
      signal: controller ? controller.signal : undefined,
    });
    if (timeout) clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.title) {
        return {
          title: data.title,
          artist: data.author_name || undefined,
        };
      }
    }
  } catch {
    // Fail silently in offline or sandboxed environments
  }
  return null;
}
