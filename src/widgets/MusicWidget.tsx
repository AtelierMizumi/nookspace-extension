import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  ListMusic,
  Disc,
  AlertCircle,
  Repeat,
  Repeat1,
  Shuffle,
  Radio,
  Search,
  ExternalLink,
  Settings2,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps, WidgetSettingsProps } from '../features/widget-system/types';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { useTranslation } from '../services/i18n';
import { LocalAudioTrackEntity } from '../types/database';
import {
  audioTrackRepository,
  SUPPORTED_AUDIO_EXTENSIONS,
} from '../services/database/repositories/audioTrackRepository';
import { UnifiedMusicTrack, RepeatMode, buildQueue, nextInOrder, prevInOrder, shuffledIds } from '../features/music/playback';
import { useWidgetCompact } from '../features/widget-system/useWidgetCompact';
import { BundledAudioTrack, loadBundledPlaylist } from '../features/music/bundledPlaylist';
import { MUSIC_PRESETS, MusicProvider, parseMusicUrl, parseSpotifyId } from '../features/music/musicUtils';

export type MusicTab = 'player' | 'playlist' | 'spotify';

export interface SpotifyHistoryItem {
  embedUrl: string;
  url: string;
  title: string;
  provider: MusicProvider;
}

export interface MusicWidgetConfig {
  activeTrackId?: string;
  autoplayNext?: boolean;
  volume?: number;
  discImage?: string;
  activeTab?: MusicTab;
  repeatMode?: RepeatMode;
  shuffle?: boolean;
  spotifyEmbedUrl?: string;
  spotifyUrl?: string;
  spotifyTitle?: string;
  spotifyProvider?: MusicProvider;
  spotifyHistory?: SpotifyHistoryItem[];
}

export const DEFAULT_MUSIC_CONFIG: MusicWidgetConfig = {
  autoplayNext: true,
  volume: 80,
  activeTab: 'player',
  repeatMode: 'all',
  shuffle: false,
  spotifyHistory: [],
};

// Global singleton to prevent multiple music widgets from playing audio simultaneously
let activePlayingInstanceId: string | null = null;

// Format seconds to mm:ss
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normalizeActiveId(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('osu=') || raw.startsWith('local=')) return raw;
  return `local=${raw}`;
}

// ==========================================
// Settings Sub-Component (Music Library & Preferences)
// ==========================================

export const MusicWidgetSettings: React.FC<WidgetSettingsProps<MusicWidgetConfig>> = ({
  config,
  onSaveConfig,
  onClose,
}) => {
  const { t } = useTranslation();
  const [tracks, setTracks] = useState<LocalAudioTrackEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [autoplayNext, setAutoplayNext] = useState(config?.autoplayNext ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    const all = await audioTrackRepository.getAllTracks();
    setTracks(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportErrors([]);

    const result = await audioTrackRepository.importAudioFiles(files);
    if (result.errors.length > 0) {
      setImportErrors(result.errors);
    }

    if (result.imported.length > 0) {
      await loadTracks();
      // If no active track, select the first imported one
      if (!config?.activeTrackId && result.imported[0]) {
        onSaveConfig({
          ...config,
          activeTrackId: `local=${result.imported[0].id}`,
          autoplayNext,
        });
      }
    }

    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await audioTrackRepository.deleteTrack(id);
    await loadTracks();
    if (config?.activeTrackId === id || config?.activeTrackId === `local=${id}`) {
      onSaveConfig({
        ...config,
        activeTrackId: undefined,
        autoplayNext,
      });
    }
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      autoplayNext,
    });
    onClose();
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div>
          <h4 className="font-semibold text-foreground text-sm">
            {t('widgets.music.library')}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {t('widgets.music.tracksCount', { count: tracks.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            className="h-7 text-xs px-2.5 font-medium"
          >
            {isImporting ? t('common.loading') : t('widgets.music.addMusic')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Import Errors Alert */}
      {importErrors.length > 0 && (
        <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-[11px] border border-destructive/20 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{t('widgets.music.cannotReadFile')}</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
            {importErrors.map((err, idx) => (
              <li key={idx} className="truncate">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Track List */}
      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            {t('common.loading')}
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-8 text-center space-y-2 border border-dashed border-border/70 rounded-lg p-4">
            <Radio className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
            <div className="font-medium text-foreground">{t('widgets.music.noTracks')}</div>
            <div className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              {t('widgets.music.noTracksDesc')}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              className="h-7 text-xs px-3 font-medium mt-1"
            >
              {t('widgets.music.addMusic')}
            </Button>
          </div>
        ) : (
          tracks.map((track) => {
            const isSelected = track.id === config?.activeTrackId || `local=${track.id}` === config?.activeTrackId;
            const sizeMB = (track.fileSize / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={track.id}
                onClick={() => {
                  onSaveConfig({
                    ...config,
                    activeTrackId: `local=${track.id}`,
                    autoplayNext,
                  });
                }}
                className={`p-2 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2 flex-1">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    <Music className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs truncate text-foreground">
                      {track.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{track.mimeType.replace('audio/', '').toUpperCase()}</span>
                      <span>•</span>
                      <span>{sizeMB} MB</span>
                      {track.duration && (
                        <>
                          <span>•</span>
                          <span>{formatTime(track.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={t('widgets.music.deleteTrack')}
                    onClick={(e) => handleDeleteTrack(track.id, e)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Autoplay Next Preference */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoplayNext}
            onChange={(e) => setAutoplayNext(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
          />
          <span className="text-xs text-foreground font-medium">
            {t('widgets.music.autoplayNext')}
          </span>
        </label>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} className="h-7 text-xs">
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
};

// ==========================================
// Main Music Widget Component (Local Audio + Playlist + Spotify + Vinyl)
// ==========================================

export const MusicWidgetComponent: React.FC<WidgetProps<MusicWidgetConfig>> = ({
  instanceId,
  config,
  onUpdateConfig,
}) => {
  const { t } = useTranslation();
  const activeConfig = config || DEFAULT_MUSIC_CONFIG;
  const activeTab = (activeConfig.activeTab as MusicTab) || 'player';
  const repeatMode: RepeatMode = (activeConfig.repeatMode as RepeatMode) || (activeConfig.autoplayNext === false ? 'off' : 'all');
  const shuffle = !!activeConfig.shuffle;

  const [localTracks, setLocalTracks] = useState<LocalAudioTrackEntity[]>([]);
  const [bundledTracks, setBundledTracks] = useState<BundledAudioTrack[]>([]);
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(() => normalizeActiveId(activeConfig.activeTrackId));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(activeConfig.volume ?? 80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  // Native HTMLAudioElement reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isCompact = useWidgetCompact(rootRef, 320);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playIntentRef = useRef(false);

  // Load local tracks from Dexie IndexedDB
  const refreshLocalTracks = useCallback(async () => {
    const list = await audioTrackRepository.getAllTracks();
    setLocalTracks(list);
  }, []);

  useEffect(() => {
    refreshLocalTracks();
    // Load bundled osu! playlist (generated by `npm run music`); silently empty when absent
    loadBundledPlaylist().then((tracks) => setBundledTracks(tracks));
  }, [refreshLocalTracks]);

  // Unified queue: bundled osu! tracks, then local device tracks
  const queue: UnifiedMusicTrack[] = useMemo(
    () =>
      buildQueue(
        bundledTracks.map((tr) => ({ id: tr.id, title: tr.title, artist: tr.artist, duration: tr.duration })),
        localTracks.map((tr) => ({ id: tr.id, name: tr.name, artist: tr.artist, duration: tr.duration }))
      ),
    [bundledTracks, localTracks]
  );

  // Play order respects shuffle state
  const order = useMemo(() => {
    const ids = queue.map((q) => q.id);
    return shuffle ? shuffledIds(ids, Math.random) : ids;
  }, [queue, shuffle]);

  // Resolve current track data from the unified queue id
  const currentTrack = useMemo(() => queue.find((q) => q.id === currentQueueId) || null, [queue, currentQueueId]);

  // Keep current selection valid when tracks are deleted/imported
  useEffect(() => {
    if (queue.length === 0) {
      if (currentQueueId !== null) setCurrentQueueId(null);
      return;
    }
    if (!currentQueueId || !queue.some((q) => q.id === currentQueueId)) {
      setCurrentQueueId(queue[0]?.id ?? null);
    }
  }, [queue, currentQueueId]);

  // Revoke object URL safely
  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }
  }, []);

  // Persist selection
  const selectQueueTrack = useCallback(
    (queueId: string | null, autoplay: boolean) => {
      playIntentRef.current = autoplay;
      setCurrentQueueId(queueId);
      onUpdateConfig({ ...activeConfig, activeTrackId: queueId ?? undefined });
    },
    [activeConfig, onUpdateConfig]
  );

  // Initialize or update audio source when the selected track changes.
  // Volume/mute intentionally excluded from deps (synced in a dedicated effect)
  // so changing volume never restarts playback.
  useEffect(() => {
    if (!currentTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      revokeCurrentObjectUrl();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    revokeCurrentObjectUrl();

    const bindAndMaybePlay = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      if (currentTrack.source === 'osu') {
        const bundled = bundledTracks.find((tr) => `osu=${tr.id}` === currentTrack.id);
        if (!bundled) {
          setPlaybackError(t('widgets.music.playbackError') || 'Cannot load audio file.');
          return;
        }
        audio.src = `music/${encodeURIComponent(bundled.file)}`;
        setDuration(bundled.duration || 0);
      } else {
        const local = localTracks.find((tr) => `local=${tr.id}` === currentTrack.id);
        if (!local) {
          setPlaybackError(t('widgets.music.playbackError') || 'Cannot load audio file.');
          return;
        }
        const newUrl = URL.createObjectURL(local.blob);
        objectUrlRef.current = newUrl;
        audio.src = newUrl;
        setDuration(local.duration || 0);
      }
      audio.volume = isMuted ? 0 : volume / 100;
      setCurrentTime(0);
      setPlaybackError(null);
      if (playIntentRef.current) {
        audio.play().catch(() => {
          setIsPlaying(false);
          setPlaybackError(t('widgets.music.playbackError') || 'Playback blocked or failed.');
        });
      } else {
        setIsPlaying(false);
      }
    };

    try {
      bindAndMaybePlay();
    } catch {
      setPlaybackError(t('widgets.music.playbackError') || 'Cannot load audio file.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, bundledTracks, localTracks, revokeCurrentObjectUrl, t]);

  // Handle Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setPlaybackError(null);
      activePlayingInstanceId = instanceId;
      if (currentQueueId?.startsWith('local=')) {
        audioTrackRepository.updateTrackMetadata(currentQueueId.slice('local='.length), {
          lastPlayedAt: Date.now(),
        });
      }
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      const nextId = nextInOrder(order, currentQueueId, repeatMode, true);
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        playIntentRef.current = true;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }
      if (!nextId) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      selectQueueTrack(nextId, true);
    };

    const onError = () => {
      setIsPlaying(false);
      setPlaybackError(t('widgets.music.playbackError') || 'Cannot play this audio file.');
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [instanceId, currentQueueId, order, repeatMode, selectQueueTrack, t]);

  // Synchronize volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Global singleton: Stop playback when another instance begins playing
  useEffect(() => {
    const checkActive = () => {
      if (activePlayingInstanceId && activePlayingInstanceId !== instanceId && isPlaying) {
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch {}
        }
        setIsPlaying(false);
      }
    };
    const interval = setInterval(checkActive, 400);
    return () => clearInterval(interval);
  }, [instanceId, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activePlayingInstanceId === instanceId) {
        activePlayingInstanceId = null;
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
        } catch {}
      }
      revokeCurrentObjectUrl();
    };
  }, [instanceId, revokeCurrentObjectUrl]);

  // Play / Pause toggle
  const handleTogglePlay = async () => {
    if (!currentTrack) {
      setActiveTab('playlist');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(null);
    if (isPlaying) {
      playIntentRef.current = false;
      audio.pause();
      setIsPlaying(false);
    } else {
      playIntentRef.current = true;
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
        setPlaybackError(t('widgets.music.playbackError') || 'Playback blocked or failed.');
      }
    }
  };

  // Next Track (respects shuffle order; preserves playing state)
  const handleNextTrack = () => {
    if (order.length === 0) return;
    const nextId = nextInOrder(order, currentQueueId, repeatMode, false);
    if (nextId) selectQueueTrack(nextId, isPlaying);
  };

  // Previous Track (restart when past 3s, else move to previous)
  const handlePrevTrack = () => {
    if (order.length === 0) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevId = prevInOrder(order, currentQueueId);
    if (prevId) selectQueueTrack(prevId, isPlaying);
  };

  // Cycle repeat mode: off → all → one
  const handleCycleRepeat = () => {
    const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    onUpdateConfig({ ...activeConfig, repeatMode: next });
  };

  const handleToggleShuffle = () => {
    onUpdateConfig({ ...activeConfig, shuffle: !shuffle });
  };

  const setActiveTab = (tab: MusicTab) => {
    onUpdateConfig({ ...activeConfig, activeTab: tab });
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Quick import from top button
  const handleQuickImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const result = await audioTrackRepository.importAudioFiles(files);
    if (result.imported.length > 0) {
      await refreshLocalTracks();
      const firstId = `local=${result.imported[0].id}`;
      selectQueueTrack(firstId, isPlaying);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Spotify / embed loading ---
  const handleLoadSpotify = () => {
    const trimmed = spotifyInput.trim();
    if (!trimmed) return;
    const parsed = parseSpotifyId(trimmed) || parseMusicUrl(trimmed);
    if (!parsed) {
      setSpotifyError(t('widgets.music.spotifyInvalid'));
      return;
    }
    setSpotifyError(null);
    const history = [
      { embedUrl: parsed.embedUrl, url: parsed.cleanUrl, title: parsed.defaultTitle, provider: parsed.provider },
      ...(activeConfig.spotifyHistory || []).filter((h) => h.embedUrl !== parsed.embedUrl),
    ].slice(0, 6);
    onUpdateConfig({
      ...activeConfig,
      spotifyEmbedUrl: parsed.embedUrl,
      spotifyUrl: parsed.cleanUrl,
      spotifyTitle: parsed.defaultTitle,
      spotifyProvider: parsed.provider,
      spotifyHistory: history,
    });
    setSpotifyInput('');
  };

  const loadSpotifyHistoryItem = (item: SpotifyHistoryItem) => {
    setSpotifyError(null);
    onUpdateConfig({
      ...activeConfig,
      spotifyEmbedUrl: item.embedUrl,
      spotifyUrl: item.url,
      spotifyTitle: item.title,
      spotifyProvider: item.provider,
    });
  };

  const filteredQueue = useMemo(() => {
    const q = playlistQuery.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (tr) => tr.title.toLowerCase().includes(q) || (tr.artist || '').toLowerCase().includes(q)
    );
  }, [queue, playlistQuery]);

  const repeatLabel =
    repeatMode === 'off'
      ? t('widgets.music.repeatOff')
      : repeatMode === 'all'
        ? t('widgets.music.repeatAll')
        : t('widgets.music.repeatOne');

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const tabs: Array<{ id: MusicTab; label: string; icon: React.ReactNode }> = [
    { id: 'player', label: t('widgets.music.tabPlayer'), icon: <Disc className="h-3 w-3" /> },
    { id: 'playlist', label: t('widgets.music.tabPlaylist'), icon: <ListMusic className="h-3 w-3" /> },
    { id: 'spotify', label: t('widgets.music.tabSpotify'), icon: <Music className="h-3 w-3" /> },
  ];

  return (
    <div ref={rootRef} className="h-full w-full flex flex-col justify-between text-xs select-none p-1">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Music className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">
            {t('widgets.music.title')}
          </span>
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-full border border-primary/30 bg-primary/10 text-primary">
            {t('widgets.music.localBadge')}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Quick upload button */}
          <Tooltip content={t('widgets.music.addMusic')} position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('widgets.music.addMusic')}
              onClick={() => fileInputRef.current?.click()}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-3 w-3" />
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.oga,.m4a,.aac,.flac,.opus,.webm"
            onChange={handleQuickImport}
            className="hidden"
          />

          {/* Library / Playlist toggle */}
          <Tooltip content={t('widgets.music.library')} position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('widgets.music.library')}
              onClick={() => setIsSettingsOpen(true)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <ListMusic className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mt-1 shrink-0" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'player' && (
        <>
          {/* 2. Interactive Spinning Vinyl Record */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative overflow-hidden py-1">
            <div
              data-testid="vinyl-disc"
              onClick={handleTogglePlay}
              data-compact={isCompact ? 'true' : 'false'}
              className={`relative z-10 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer group select-none overflow-hidden ${
                isCompact ? 'h-16 w-16' : 'h-28 w-28 sm:h-32 sm:w-32'
              }`}
              style={{
                background:
                  'radial-gradient(circle, #27272a 0%, #18181b 20%, #09090b 45%, #27272a 47%, #09090b 50%, #18181b 80%, #09090b 100%)',
                animation: 'spin 4s linear infinite',
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
              aria-label={isPlaying ? t('widgets.music.pause') : t('widgets.music.play')}
              role="button"
              tabIndex={0}
            >
              {/* Optional Disc Cover Image */}
              {activeConfig.discImage && (
                <img
                  src={activeConfig.discImage}
                  alt="Disc Cover"
                  className="absolute inset-0 h-full w-full object-cover rounded-full pointer-events-none"
                />
              )}

              {/* Vinyl Grooves & Concentric Sheen Overlays */}
              <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/10 pointer-events-none" />

              {/* Center Vinyl Label with Play/Pause Button */}
              <div className={`relative z-20 rounded-full bg-gradient-to-tr from-primary to-indigo-600 border-2 border-background flex items-center justify-center shadow-lg text-primary-foreground group-hover:scale-110 transition-transform ${
                isCompact ? 'h-8 w-8' : 'h-10 w-10 sm:h-11 sm:w-11'
              }`}>
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </div>
            </div>

            {/* Playback Error Alert */}
            {playbackError && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] mt-1.5 max-w-[260px] truncate">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{playbackError}</span>
              </div>
            )}
          </div>

          {/* 3. Track Info & Seek Bar */}
          <div className="space-y-1 mb-1">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground text-xs truncate">
                  {currentTrack ? currentTrack.title : t('widgets.music.noTracks')}
                </div>
                <div className={`text-[10px] text-muted-foreground truncate flex items-center gap-1 ${isCompact ? 'hidden' : ''}`}>
                  {isPlaying && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span>{currentTrack?.artist || t('widgets.music.defaultArtist')}</span>
                  {currentTrack?.source === 'osu' && (
                    <span className="px-1 rounded-sm bg-fuchsia-500/15 text-fuchsia-500 font-semibold">
                      {t('widgets.music.osuBadge')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Seek Slider */}
            <div className="w-full relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!currentTrack || duration === 0}
                aria-label={t('widgets.music.title')}
                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40"
              />
              <span className="sr-only">{progressPercent.toFixed(0)}%</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'playlist' && (
        <div className="flex-1 flex flex-col min-h-0 py-1">
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={playlistQuery}
              onChange={(e) => setPlaylistQuery(e.target.value)}
              placeholder={t('widgets.music.playlistSearchPlaceholder')}
              aria-label={t('widgets.music.playlistSearch')}
              className="flex-1 h-7 px-2 rounded bg-secondary/40 border border-border/40 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {t('widgets.music.tracksCount', { count: queue.length })}
            </span>
          </div>
          <div
            className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0"
            role="listbox"
            aria-label={t('widgets.music.playlistSearch')}
          >
            {filteredQueue.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-[11px]">
                {queue.length === 0 ? t('widgets.music.noTracks') : t('widgets.music.playlistEmpty')}
              </div>
            ) : (
              filteredQueue.map((track) => {
                const isCurrent = track.id === currentQueueId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => selectQueueTrack(track.id, true)}
                    className={`w-full p-1.5 rounded-lg border flex items-center gap-2 text-left transition-colors ${
                      isCurrent
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/30 hover:bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        isCurrent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3 ml-0.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-[11px] truncate text-foreground">
                        {track.title}
                      </span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {track.artist || t('widgets.music.defaultArtist')}
                        {track.duration ? ` · ${formatTime(track.duration)}` : ''}
                      </span>
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1 rounded-sm ${
                        track.source === 'osu'
                          ? 'bg-fuchsia-500/15 text-fuchsia-500'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {track.source === 'osu' ? t('widgets.music.osuBadge') : t('widgets.music.localBadge')}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'spotify' && (
        <div className="flex-1 flex flex-col min-h-0 py-1">
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <input
              type="text"
              value={spotifyInput}
              onChange={(e) => setSpotifyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadSpotify();
              }}
              placeholder={t('widgets.music.spotifyPlaceholder')}
              aria-label={t('widgets.music.spotifyUrlLabel')}
              className="flex-1 h-7 px-2 rounded bg-secondary/40 border border-border/40 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <Button size="sm" variant="primary" onClick={handleLoadSpotify} className="h-7 px-2 text-[11px]">
              {t('widgets.music.spotifyLoad')}
            </Button>
          </div>
          {spotifyError && (
            <div className="px-1 text-[10px] text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{spotifyError}</span>
            </div>
          )}
          {activeConfig.spotifyEmbedUrl ? (
            <div className="flex-1 min-h-[120px] flex flex-col gap-1 px-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground truncate">
                  {activeConfig.spotifyTitle || t('widgets.music.defaultTitle')}
                </span>
                {activeConfig.spotifyUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(activeConfig.spotifyUrl, '_blank', 'noopener,noreferrer')}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('widgets.music.openExternal')}
                  </button>
                )}
              </div>
              {activeConfig.spotifyProvider === 'audio' ? (
                <audio controls src={activeConfig.spotifyUrl} className="w-full" />
              ) : (
                <iframe
                  src={activeConfig.spotifyEmbedUrl}
                  title={activeConfig.spotifyTitle || t('widgets.music.defaultTitle')}
                  className="flex-1 w-full min-h-[120px] rounded-lg border border-border/30 bg-black"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Radio className="h-6 w-6 text-muted-foreground opacity-50 mb-1" />
              <div className="text-[11px] text-muted-foreground">{t('widgets.music.spotifyHint')}</div>
            </div>
          )}
          {/* Presets + history */}
          <div className="flex flex-wrap items-center gap-1 px-1 mt-1 shrink-0">
            {MUSIC_PRESETS.filter((p) => p.provider === 'spotify' || p.provider === 'youtube').map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    ...activeConfig,
                    spotifyEmbedUrl: preset.embedUrl,
                    spotifyUrl: preset.url,
                    spotifyTitle: preset.name,
                    spotifyProvider: preset.provider,
                  })
                }
                className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/50"
              >
                {preset.name}
              </button>
            ))}
            {(activeConfig.spotifyHistory || []).slice(0, 3).map((item) => (
              <button
                key={item.embedUrl}
                type="button"
                onClick={() => loadSpotifyHistoryItem(item)}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border truncate max-w-[150px] ${
                  item.embedUrl === activeConfig.spotifyEmbedUrl
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border/40 text-muted-foreground'
                }`}
                title={item.title}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Controls Footer (local playback tabs only) */}
      {activeTab !== 'spotify' && (
        <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-1.5 shrink-0">
          {/* Left: Shuffle + Repeat mode */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleShuffle}
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                shuffle ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={t('widgets.music.shuffle')}
              title={t('widgets.music.shuffle')}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCycleRepeat}
              className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                repeatMode !== 'off' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={repeatLabel}
              title={repeatLabel}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Center: Previous, Play/Pause, Next */}
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('widgets.music.previous')}
              onClick={handlePrevTrack}
              disabled={order.length <= 1}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <SkipBack className="h-3.5 w-3.5 fill-current" />
            </IconButton>

            <Button
              size="sm"
              variant={isPlaying ? 'primary' : 'secondary'}
              onClick={handleTogglePlay}
              leftIcon={
                isPlaying ? (
                  <Pause className="h-3 w-3 fill-current" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )
              }
              className="h-7 text-xs px-2.5 font-medium"
            >
              {isPlaying ? t('widgets.music.pause') : t('widgets.music.play')}
            </Button>

            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('widgets.music.next')}
              onClick={handleNextTrack}
              disabled={order.length <= 1}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <SkipForward className="h-3.5 w-3.5 fill-current" />
            </IconButton>
          </div>

          {/* Right: Volume Control */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? t('widgets.music.unmute') : t('widgets.music.mute')}
              className="text-muted-foreground hover:text-foreground"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVolume(val);
                if (isMuted) setIsMuted(false);
                onUpdateConfig({
                  ...activeConfig,
                  volume: val,
                });
              }}
              className="w-10 sm:w-12 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label={t('widgets.music.volume')}
            />
          </div>
        </div>
      )}

      {/* Spotify footer (volume only — embed handles its own playback) */}
      {activeTab === 'spotify' && (
        <div className="pt-1.5 border-t border-border/30 flex items-center gap-1.5 shrink-0 justify-end">
          <Settings2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{t('widgets.music.spotifyHint')}</span>
        </div>
      )}

      {/* Library & Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          refreshLocalTracks();
        }}
        title={t('widgets.music.settingsTitle')}
        description={t('widgets.music.settingsDescription')}
      >
        <MusicWidgetSettings
          config={activeConfig}
          onSaveConfig={(updated) => {
            onUpdateConfig(updated);
            refreshLocalTracks();
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            refreshLocalTracks();
          }}
        />
      </Modal>
    </div>
  );
};

export const MusicWidget: WidgetDefinition<MusicWidgetConfig> = {
  type: 'music',
  name: 'Music Player',
  description: 'Local audio player with playlist, osu! library, Spotify embed and spinning vinyl record animation.',
  category: 'productivity',
  icon: Music,
  defaultConfig: DEFAULT_MUSIC_CONFIG,
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 4, h: 4 },
  component: MusicWidgetComponent,
  settingsComponent: MusicWidgetSettings,
};
