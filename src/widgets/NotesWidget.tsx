import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Pin,
  Star,
  Clock,
  Folder,
  Plus,
  Settings2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  WidgetDefinition,
  WidgetProps,
  WidgetSettingsProps,
} from '../features/widget-system/types';
import { useNoteStore, STORAGE_KEY_NOTES_LAST_UPDATED_AT } from '../features/notes/stores/noteStore';
import { openNotesManager } from '../features/notes';
import { NoteEntity, NoteCollectionEntity } from '../types/notes';
import { IconButton, Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { useTranslation } from '../services/i18n';

export type NotesDisplayMode = 'recent' | 'pinned' | 'favorites' | 'collection';
export type NotesDensity = 'comfortable' | 'compact';

export interface NotesWidgetConfig {
  mode?: NotesDisplayMode;
  collectionId?: string | null;
  maxItems?: number;
  showExcerpts?: boolean;
  showCollectionLabel?: boolean;
  density?: NotesDensity;
  showQuickCreate?: boolean;
  title?: string;
}

// ==========================================
// Relative Time Helper
// ==========================================

function formatNoteTime(
  timestamp: number,
  t?: (key: string, params?: Record<string, any>) => string
): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (t) {
    if (minutes < 1) return t('widgets.notes.relativeTime.justNow');
    if (minutes < 60) return t('widgets.notes.relativeTime.minutesAgo', { minutes });
    if (hours < 24) return t('widgets.notes.relativeTime.hoursAgo', { hours });
    if (days < 7) return t('widgets.notes.relativeTime.daysAgo', { days });
  } else {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ==========================================
// Settings Sub-Component
// ==========================================

export const NotesWidgetSettings: React.FC<
  WidgetSettingsProps<NotesWidgetConfig>
> = ({ config, onSaveConfig, onClose }) => {
  const collections = useNoteStore((s) => s.collections);

  const [mode, setMode] = useState<NotesDisplayMode>(config?.mode || 'recent');
  const [collectionId, setCollectionId] = useState<string | null>(
    config?.collectionId ?? null
  );
  const [maxItems, setMaxItems] = useState<number>(config?.maxItems ?? 5);
  const [showExcerpts, setShowExcerpts] = useState<boolean>(
    config?.showExcerpts ?? true
  );
  const [showCollectionLabel, setShowCollectionLabel] = useState<boolean>(
    config?.showCollectionLabel ?? true
  );
  const [density, setDensity] = useState<NotesDensity>(
    config?.density ?? 'comfortable'
  );
  const [showQuickCreate, setShowQuickCreate] = useState<boolean>(
    config?.showQuickCreate ?? true
  );

  const handleSave = () => {
    onSaveConfig({
      mode,
      collectionId: mode === 'collection' ? collectionId : null,
      maxItems,
      showExcerpts,
      showCollectionLabel,
      density,
      showQuickCreate,
    });
    onClose();
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* 1. Mode Selector */}
      <div className="space-y-1.5">
        <label className="font-medium text-foreground block">Display Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as NotesDisplayMode)}
          className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="recent">Recent Notes (Default)</option>
          <option value="pinned">Pinned Notes</option>
          <option value="favorites">Favorite Notes</option>
          <option value="collection">Collection Notes</option>
        </select>
        <p className="text-[11px] text-muted-foreground">
          Choose which subset of notes to present on your dashboard.
        </p>
      </div>

      {/* 2. Collection Picker (Only when mode === 'collection') */}
      {mode === 'collection' && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <label className="font-medium text-foreground block">Select Collection</label>
          <select
            value={collectionId || 'uncategorized'}
            onChange={(e) =>
              setCollectionId(e.target.value === 'uncategorized' ? null : e.target.value)
            }
            className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="uncategorized">📁 Uncategorized Notes</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                📁 {col.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Items Limit */}
      <div className="space-y-1.5">
        <label className="font-medium text-foreground block">Maximum Displayed Notes</label>
        <select
          value={maxItems}
          onChange={(e) => setMaxItems(Number(e.target.value))}
          className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value={3}>3 Notes</option>
          <option value={5}>5 Notes (Default)</option>
          <option value={8}>8 Notes</option>
          <option value={10}>10 Notes</option>
        </select>
      </div>

      {/* 4. Display Toggles */}
      <div className="space-y-2.5 pt-1 border-t border-border/40">
        <Switch
          checked={showExcerpts}
          onCheckedChange={setShowExcerpts}
          label="Show note excerpt preview"
        />
        <Switch
          checked={showCollectionLabel}
          onCheckedChange={setShowCollectionLabel}
          label="Show collection badge"
        />
        <Switch
          checked={showQuickCreate}
          onCheckedChange={setShowQuickCreate}
          label="Show quick-create button in header"
        />
        <Switch
          checked={density === 'compact'}
          onCheckedChange={(compact) => setDensity(compact ? 'compact' : 'comfortable')}
          label="Compact note list density"
        />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

// ==========================================
// Main Widget Component
// ==========================================

export const NotesWidgetComponent: React.FC<
  WidgetProps<NotesWidgetConfig>
> = ({ workspaceId, config, onUpdateConfig }) => {
  const { t } = useTranslation();
  const {
    notes,
    collections,
    isLoading,
    error,
    activeWorkspaceId,
    initialize,
    loadNotes,
    loadCollections,
    createNote,
  } = useNoteStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Configuration options with defaults
  const mode = config?.mode || 'recent';
  const collectionId = config?.collectionId ?? null;
  const maxItems = config?.maxItems ?? 5;
  const showExcerpts = config?.showExcerpts ?? true;
  const showCollectionLabel = config?.showCollectionLabel ?? true;
  const density = config?.density ?? 'comfortable';
  const showQuickCreate = config?.showQuickCreate ?? true;

  // 1. Initial hydration & workspace isolation
  useEffect(() => {
    if (workspaceId && activeWorkspaceId !== workspaceId) {
      initialize(workspaceId);
    }
  }, [workspaceId, activeWorkspaceId, initialize]);

  // 2. Cross-tab live synchronization via browser storage events
  useEffect(() => {
    const ext =
      typeof browser !== 'undefined' && browser.storage?.onChanged
        ? browser
        : typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? chrome
        : null;

    if (!ext) return;

    const handleStorageChange = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY_NOTES_LAST_UPDATED_AT]) {
        loadNotes(workspaceId);
        loadCollections(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [workspaceId, loadNotes, loadCollections]);

  // Map of collections for quick lookup
  const collectionMap = useMemo(() => {
    return new Map(collections.map((c) => [c.id, c]));
  }, [collections]);

  // Resolve active collection entity if mode === 'collection'
  const activeCollection = useMemo(() => {
    if (mode === 'collection' && collectionId) {
      return collectionMap.get(collectionId) || null;
    }
    return null;
  }, [mode, collectionId, collectionMap]);

  // 3. Filter notes based on configured mode
  const displayedNotes = useMemo(() => {
    const workspaceNotes = notes.filter(
      (n) => n.workspaceId === workspaceId && !n.isArchived
    );

    let filtered: NoteEntity[] = [];

    if (mode === 'pinned') {
      filtered = workspaceNotes
        .filter((n) => n.isPinned)
        .sort((a, b) => a.order - b.order || b.updatedAt - a.updatedAt);
    } else if (mode === 'favorites') {
      filtered = workspaceNotes
        .filter((n) => n.isFavorite)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (mode === 'collection') {
      filtered = workspaceNotes
        .filter((n) => n.collectionId === collectionId)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // Default: recent
      filtered = [...workspaceNotes].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return filtered.slice(0, maxItems);
  }, [notes, workspaceId, mode, collectionId, maxItems]);

  // Quick Create Note
  const handleQuickCreate = async () => {
    if (isCreatingNote) return;
    setIsCreatingNote(true);

    try {
      const targetCol = mode === 'collection' && collectionId ? collectionId : null;
      const newNote = await createNote({
        title: 'Untitled Note',
        content: '',
        collectionId: targetCol,
        workspaceId,
      });

      openNotesManager({ noteId: newNote.id });
    } catch (err) {
      console.error('Failed to create note from widget:', err);
    } finally {
      setIsCreatingNote(false);
    }
  };

  // Open note in Notes Manager
  const handleOpenNote = (noteId: string) => {
    openNotesManager({ noteId });
  };

  // Open Notes Manager directly
  const handleOpenManager = () => {
    if (mode === 'collection') {
      openNotesManager({ collectionId });
    } else {
      openNotesManager();
    }
  };

  // Header Mode Badge
  const renderHeaderBadge = () => {
    if (mode === 'pinned') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-amber-500">
          <Pin className="h-2.5 w-2.5 fill-current" />
          <span>Pinned</span>
        </Badge>
      );
    }
    if (mode === 'favorites') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-amber-400">
          <Star className="h-2.5 w-2.5 fill-current" />
          <span>Favorites</span>
        </Badge>
      );
    }
    if (mode === 'collection') {
      if (activeCollection) {
        return (
          <Badge
            variant="outline"
            className="text-[10px] gap-1.5 px-1.5 py-0 truncate max-w-[110px]"
            title={activeCollection.title}
          >
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: activeCollection.color || '#3B82F6' }}
            />
            <span className="truncate">{activeCollection.title}</span>
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-muted-foreground">
          <Folder className="h-2.5 w-2.5" />
          <span>Uncategorized</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-muted-foreground">
        <Clock className="h-2.5 w-2.5" />
        <span>Recent</span>
      </Badge>
    );
  };

  // Empty State Rendering
  const renderEmptyState = () => {
    if (mode === 'pinned') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1.5">
            <Pin className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-foreground">{t('widgets.notes.noPinnedNotes')}</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
            {t('widgets.notes.noPinnedNotesDesc')}
          </p>
          <Button variant="ghost" size="sm" onClick={handleOpenManager} className="h-7 text-xs">
            {t('widgets.notes.openNotesManager')}
          </Button>
        </div>
      );
    }

    if (mode === 'favorites') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <div className="h-8 w-8 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mb-1.5">
            <Star className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-foreground">{t('widgets.notes.noFavoriteNotes')}</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
            {t('widgets.notes.noFavoriteNotesDesc')}
          </p>
          <Button variant="ghost" size="sm" onClick={handleOpenManager} className="h-7 text-xs">
            {t('widgets.notes.openNotesManager')}
          </Button>
        </div>
      );
    }

    if (mode === 'collection') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <p className="text-xs font-medium text-foreground">
            {activeCollection
              ? t('widgets.notes.noNotesInCollection', { collection: activeCollection.title })
              : t('widgets.notes.noUncategorizedNotes')}
          </p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
            {t('widgets.notes.collectionEmptyDesc')}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleQuickCreate}
            leftIcon={<Plus className="h-3 w-3" />}
            className="h-7 text-xs"
          >
            {t('widgets.notes.addNoteHere')}
          </Button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5">
          <FileText className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium text-foreground">{t('widgets.notes.noNotesYet')}</p>
        <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
          {t('widgets.notes.emptyNotesDesc')}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={handleQuickCreate}
          leftIcon={<Plus className="h-3 w-3" />}
          className="h-7 text-xs"
        >
          {t('widgets.notes.createFirstNote')}
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden text-xs select-none">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0 gap-2">
        {/* Left: Branding, Title & Mode Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground text-xs truncate">
            {config?.title || t('notesManager.title') || 'Notes & Knowledge'}
          </span>
          {renderHeaderBadge()}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {showQuickCreate && (
            <Tooltip content={t('widgets.notes.newNote')} position="bottom">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Create Note"
                disabled={isCreatingNote}
                onClick={handleQuickCreate}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                {isCreatingNote ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip content={t('widgets.notes.openNotesManager')} position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('widgets.notes.openNotesManager')}
              onClick={handleOpenManager}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* 2. Main Note List Body */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && notes.length === 0 ? (
          /* Loading Skeletons */
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-border/40 bg-secondary/20 space-y-1.5"
              >
                <Skeleton className="h-3.5 w-2/3 rounded animate-shimmer" />
                <Skeleton className="h-2.5 w-full rounded animate-shimmer" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="h-full flex flex-col items-center justify-center text-center p-3 text-destructive">
            <AlertCircle className="h-5 w-5 mb-1" />
            <span className="text-xs">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadNotes(workspaceId)}
              className="mt-2 text-xs h-7"
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : displayedNotes.length === 0 ? (
          /* Empty State */
          renderEmptyState()
        ) : (
          /* Populated Notes List */
          <div role="list" className="space-y-1.5">
            {displayedNotes.map((note) => {
              const collection = note.collectionId
                ? collectionMap.get(note.collectionId)
                : undefined;

              return (
                <div key={note.id} role="listitem">
                  <button
                    type="button"
                    onClick={() => handleOpenNote(note.id)}
                    title={`Open "${note.title}" in Notes Manager`}
                    className={cn(
                      'group relative w-full flex flex-col rounded-lg border transition-all text-left focus:outline-none focus:ring-1 focus:ring-ring select-none overflow-hidden border-border/40 bg-card hover:bg-secondary/40 hover:border-border shadow-xs',
                      density === 'compact' ? 'p-1.5 gap-1' : 'p-2.5 gap-1.5'
                    )}
                  >
                    {/* Top Line: Title, Status Indicators, Collection, Date */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {note.isPinned && (
                          <Pin className="h-3 w-3 text-amber-500 fill-current shrink-0" />
                        )}
                        {note.isFavorite && (
                          <Star className="h-3 w-3 text-amber-400 fill-current shrink-0" />
                        )}
                        <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {note.title || 'Untitled Note'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                        {showCollectionLabel && collection && (
                          <span
                            className="text-[10px] px-1.5 py-0.2 rounded bg-secondary border border-border/40 shrink-0 hidden sm:inline truncate max-w-[80px]"
                            style={{
                              borderLeftColor: collection.color || '#3B82F6',
                              borderLeftWidth: '2px',
                            }}
                          >
                            {collection.title}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/75 font-mono whitespace-nowrap">
                          {formatNoteTime(note.updatedAt, t)}
                        </span>
                      </div>
                    </div>

                    {/* Excerpt Body */}
                    {showExcerpts && note.excerpt && (
                      <p
                        className={cn(
                          'text-[11px] text-muted-foreground/80 leading-relaxed overflow-hidden text-ellipsis',
                          density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
                        )}
                      >
                        {note.excerpt}
                      </p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. In-Widget Settings Modal */}
      {isSettingsOpen && (
        <Modal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Notes Widget Settings"
          description="Configure visible notes, collection filtering, and density."
          size="sm"
        >
          <NotesWidgetSettings
            config={config}
            onSaveConfig={(newConfig) => {
              onUpdateConfig(newConfig);
              setIsSettingsOpen(false);
            }}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

// ==========================================
// Widget Registration Definition
// ==========================================

export const NotesWidget: WidgetDefinition<NotesWidgetConfig> = {
  type: 'notes',
  name: 'Notes & Knowledge',
  description: 'View recent, pinned, or favorite notes and create notes from your dashboard.',
  category: 'organization',
  icon: FileText,
  defaultConfig: {
    mode: 'recent',
    collectionId: null,
    maxItems: 5,
    showExcerpts: true,
    showCollectionLabel: true,
    density: 'comfortable',
    showQuickCreate: true,
  },
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 3, h: 2 },
  maxDimensions: { w: 12, h: 8 },
  component: NotesWidgetComponent,
  settingsComponent: NotesWidgetSettings,
};
