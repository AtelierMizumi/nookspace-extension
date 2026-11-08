import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Radio,
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

export interface MusicWidgetConfig {
  activeTrackId?: string;
  autoplayNext?: boolean;
  volume?: number;
  discImage?: string;
}

export const DEFAULT_MUSIC_CONFIG: MusicWidgetConfig = {
  autoplayNext: true,
  volume: 80,
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
          activeTrackId: result.imported[0].id,
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
    if (config?.activeTrackId === id) {
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
            const isSelected = track.id === config?.activeTrackId;
            const sizeMB = (track.fileSize / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={track.id}
                onClick={() => {
                  onSaveConfig({
                    ...config,
                    activeTrackId: track.id,
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
// Main Music Widget Component (Local Audio + Animated Vinyl)
// ==========================================

export const MusicWidgetComponent: React.FC<WidgetProps<MusicWidgetConfig>> = ({
  instanceId,
  config,
  onUpdateConfig,
}) => {
  const { t } = useTranslation();
  const activeConfig = config || DEFAULT_MUSIC_CONFIG;

  const [tracks, setTracks] = useState<LocalAudioTrackEntity[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(activeConfig.volume ?? 80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Native HTMLAudioElement reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tracks from Dexie IndexedDB
  const refreshTracks = useCallback(async () => {
    const list = await audioTrackRepository.getAllTracks();
    setTracks(list);

    if (list.length > 0) {
      if (activeConfig.activeTrackId) {
        const foundIdx = list.findIndex((t) => t.id === activeConfig.activeTrackId);
        setCurrentTrackIndex(foundIdx >= 0 ? foundIdx : 0);
      } else {
        setCurrentTrackIndex(0);
      }
    }
  }, [activeConfig.activeTrackId]);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  // Current active track entity
  const currentTrack = tracks[currentTrackIndex] || null;

  // Revoke object URL safely
  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {}
      objectUrlRef.current = null;
    }
  }, []);

  // Initialize or update audio source when active track changes
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

    // Stop current playback before switching track
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    revokeCurrentObjectUrl();

    // Create fresh object URL from persisted IndexedDB Blob
    try {
      const newUrl = URL.createObjectURL(currentTrack.blob);
      objectUrlRef.current = newUrl;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.src = newUrl;
      audio.volume = isMuted ? 0 : volume / 100;
      setCurrentTime(0);
      setDuration(currentTrack.duration || 0);
      setPlaybackError(null);
    } catch (err: any) {
      setPlaybackError(t('widgets.music.playbackError') || 'Cannot load audio file.');
    }
  }, [currentTrack, revokeCurrentObjectUrl, isMuted, volume, t]);

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
      if (currentTrack) {
        audioTrackRepository.updateTrackMetadata(currentTrack.id, {
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
      setIsPlaying(false);
      setCurrentTime(0);

      // Autoplay next track if enabled
      if (activeConfig.autoplayNext && tracks.length > 1) {
        const nextIdx = (currentTrackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIdx);
        onUpdateConfig({
          ...activeConfig,
          activeTrackId: tracks[nextIdx].id,
        });
      }
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
  }, [instanceId, currentTrack, currentTrackIndex, tracks, activeConfig, onUpdateConfig, t]);

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
      // If no tracks, open library/file picker
      setIsSettingsOpen(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        // isPlaying will be set to true by the 'playing' event handler
      } catch (err: any) {
        setIsPlaying(false);
        setPlaybackError(t('widgets.music.playbackError') || 'Playback blocked or failed.');
      }
    }
  };

  // Next Track
  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIdx);
    onUpdateConfig({
      ...activeConfig,
      activeTrackId: tracks[nextIdx].id,
    });
  };

  // Previous Track
  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    // If past 3 seconds, restart current track; otherwise go to previous
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIdx);
    onUpdateConfig({
      ...activeConfig,
      activeTrackId: tracks[prevIdx].id,
    });
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
      await refreshTracks();
      const firstId = result.imported[0].id;
      onUpdateConfig({
        ...activeConfig,
        activeTrackId: firstId,
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-full w-full flex flex-col justify-between text-xs select-none p-1">
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

      {/* 2. Interactive Spinning Vinyl Record (Đĩa than xoay hoạt hình) */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative overflow-hidden">
        <div
          data-testid="vinyl-disc"
          onClick={handleTogglePlay}
          className="relative z-10 h-28 w-28 sm:h-32 sm:w-32 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer group select-none overflow-hidden"
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
          <div className="relative z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-tr from-primary to-indigo-600 border-2 border-background flex items-center justify-center shadow-lg text-primary-foreground group-hover:scale-110 transition-transform">
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
              {currentTrack ? currentTrack.name : t('widgets.music.noTracks')}
            </div>
            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              {isPlaying && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span>{currentTrack?.artist || t('widgets.music.defaultArtist')}</span>
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
        </div>
      </div>

      {/* 4. Controls Footer */}
      <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-1.5 shrink-0">
        {/* Left: Autoplay Next indicator / toggle */}
        <button
          type="button"
          onClick={() => {
            onUpdateConfig({
              ...activeConfig,
              autoplayNext: !activeConfig.autoplayNext,
            });
          }}
          className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
            activeConfig.autoplayNext
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={t('widgets.music.autoplayNext')}
        >
          <Repeat className="h-3.5 w-3.5" />
        </button>

        {/* Center: Previous, Play/Pause, Next */}
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t('widgets.music.previous')}
            onClick={handlePrevTrack}
            disabled={tracks.length <= 1}
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
            disabled={tracks.length <= 1}
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

      {/* Library & Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          refreshTracks();
        }}
        title={t('widgets.music.settingsTitle')}
        description={t('widgets.music.settingsDescription')}
      >
        <MusicWidgetSettings
          config={activeConfig}
          onSaveConfig={(updated) => {
            onUpdateConfig(updated);
            refreshTracks();
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            refreshTracks();
          }}
        />
      </Modal>
    </div>
  );
};

export const MusicWidget: WidgetDefinition<MusicWidgetConfig> = {
  type: 'music',
  name: 'Music Player',
  description: 'Local audio player with spinning vinyl record animation and offline music library.',
  category: 'productivity',
  icon: Music,
  defaultConfig: DEFAULT_MUSIC_CONFIG,
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: MusicWidgetComponent,
  settingsComponent: MusicWidgetSettings,
};
