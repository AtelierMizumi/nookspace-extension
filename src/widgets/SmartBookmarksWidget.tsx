import React, { useEffect, useState, useMemo } from 'react';
import {
  Bookmark,
  Globe,
  ExternalLink,
  Settings2,
  Plus,
  Star,
  Folder,
  AlertCircle,
} from 'lucide-react';
import {
  WidgetDefinition,
  WidgetProps,
  WidgetSettingsProps,
} from '../features/widget-system/types';
import { useBookmarkStore } from '../features/bookmarks/stores/bookmarkStore';
import { STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT } from '../features/bookmarks/stores/bookmarkStore';
import { isSafeBookmarkUrl } from '../features/bookmarks/utils/bookmarkSecurity';
import { extractDomain } from '../features/bookmarks/services/bookmarkSearchService';
import { openBookmarkManager } from '../features/bookmarks';
import { BookmarkEntity } from '../types/bookmarks';
import { IconButton, Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { useTranslation } from '../services/i18n';

export type SmartBookmarksSource = 'all' | 'favorites' | 'uncategorized' | 'folder';

export interface SmartBookmarksConfig {
  source?: SmartBookmarksSource;
  folderId?: string | null;
  maxItems?: number;
  showDomain?: boolean;
  compactDensity?: boolean;
  title?: string;
}

// ==========================================
// Favicon Component with Safe Fallback
// ==========================================

const BookmarkFavicon: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const [hasError, setHasError] = useState(false);
  const domain = useMemo(() => extractDomain(url), [url]);

  if (hasError || !domain) {
    return (
      <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Globe className="h-3.5 w-3.5" />
      </div>
    );
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      className="h-6 w-6 rounded shrink-0 object-contain bg-background/50"
      onError={() => setHasError(true)}
    />
  );
};

// ==========================================
// Settings Sub-Component
// ==========================================

export const SmartBookmarksWidgetSettings: React.FC<
  WidgetSettingsProps<SmartBookmarksConfig>
> = ({ config, onSaveConfig, onClose }) => {
  const { t } = useTranslation();
  const groups = useBookmarkStore((s) => s.groups);

  const [source, setSource] = useState<SmartBookmarksSource>(config?.source || 'all');
  const [folderId, setFolderId] = useState<string | null>(config?.folderId ?? null);
  const [maxItems, setMaxItems] = useState<number>(config?.maxItems ?? 8);
  const [showDomain, setShowDomain] = useState<boolean>(config?.showDomain ?? true);
  const [compactDensity, setCompactDensity] = useState<boolean>(
    config?.compactDensity ?? false
  );

  const handleSourceChange = (val: string) => {
    if (val === 'all' || val === 'favorites' || val === 'uncategorized') {
      setSource(val);
      setFolderId(null);
    } else if (val.startsWith('folder:')) {
      setSource('folder');
      setFolderId(val.replace('folder:', ''));
    }
  };

  const handleSave = () => {
    onSaveConfig({
      source,
      folderId,
      maxItems,
      showDomain,
      compactDensity,
    });
    onClose();
  };

  // Determine current select value
  const selectValue = source === 'folder' && folderId ? `folder:${folderId}` : source;

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Source Category / Folder */}
      <div>
        <label htmlFor="sb-source-select" className="font-medium text-foreground block mb-1.5">
          {t('bookmarks.displayFrom')}
        </label>
        <select
          id="sb-source-select"
          value={selectValue}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">{t('bookmarks.allBookmarksOption')}</option>
          <option value="favorites">{t('bookmarks.favoritesOption')}</option>
          <option value="uncategorized">{t('bookmarks.uncategorized')}</option>
          {groups.length > 0 && (
            <optgroup label={t('bookmarks.folders')}>
              {groups.map((g) => (
                <option key={g.id} value={`folder:${g.id}`}>
                  {g.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* 2. Maximum Visible Items */}
      <div>
        <label htmlFor="sb-max-items-select" className="font-medium text-foreground block mb-1.5">
          {t('bookmarks.maxVisible')}
        </label>
        <select
          id="sb-max-items-select"
          value={maxItems}
          onChange={(e) => setMaxItems(Number(e.target.value))}
          className="w-full h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value={4}>4</option>
          <option value={6}>6</option>
          <option value={8}>8</option>
          <option value={12}>12</option>
          <option value={16}>16</option>
        </select>
      </div>

      {/* 3. Display Options */}
      <div className="space-y-2.5 pt-1 border-t border-border/40">
        <Switch
          checked={showDomain}
          onCheckedChange={setShowDomain}
          label={t('bookmarks.showDomain')}
        />
        <Switch
          checked={compactDensity}
          onCheckedChange={setCompactDensity}
          label={t('bookmarks.compactDensity')}
        />
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave}>
          {t('common.saveSettings')}
        </Button>
      </div>
    </div>
  );
};

// ==========================================
// Main Widget Component
// ==========================================

export const SmartBookmarksWidgetComponent: React.FC<
  WidgetProps<SmartBookmarksConfig>
> = ({ workspaceId, config, onUpdateConfig }) => {
  const { t } = useTranslation();
  const {
    bookmarks,
    groups,
    isLoading,
    error,
    activeWorkspaceId,
    initialize,
    loadBookmarks,
    loadGroups,
  } = useBookmarkStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Configuration values with safe fallbacks
  const source = config?.source || 'all';
  const folderId = config?.folderId ?? null;
  const maxItems = config?.maxItems ?? 8;
  const showDomain = config?.showDomain ?? true;
  const compactDensity = config?.compactDensity ?? false;

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
      if (areaName === 'local' && changes[STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT]) {
        loadBookmarks(workspaceId);
        loadGroups(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [workspaceId, loadBookmarks, loadGroups]);

  // 3. Resolve active folder entity (if configured for folder source)
  const activeFolder = useMemo(() => {
    if (source === 'folder' && folderId) {
      return groups.find((g) => g.id === folderId) || null;
    }
    return null;
  }, [source, folderId, groups]);

  // Graceful recovery: If configured for a folder that no longer exists,
  // we treat it gracefully and fall back to all bookmarks.
  const isMissingFolder = source === 'folder' && folderId && !activeFolder;

  // 4. Filter and sort bookmarks for this widget instance
  const displayedBookmarks = useMemo(() => {
    // Defensively enforce workspace isolation
    const workspaceBookmarks = bookmarks.filter((b) => b.workspaceId === workspaceId);

    let filtered: BookmarkEntity[] = [];

    if (source === 'favorites') {
      filtered = workspaceBookmarks.filter((b) => b.isFavorite);
    } else if (source === 'uncategorized') {
      filtered = workspaceBookmarks.filter((b) => b.groupId === null);
    } else if (source === 'folder' && activeFolder) {
      filtered = workspaceBookmarks.filter((b) => b.groupId === activeFolder.id);
    } else {
      // 'all' or missing folder fallback
      filtered = workspaceBookmarks;
    }

    // Preserve deterministic manual ordering
    return [...filtered].sort((a, b) => a.order - b.order).slice(0, maxItems);
  }, [bookmarks, workspaceId, source, activeFolder, maxItems]);

  // Safe external navigation
  const handleOpenBookmark = (url: string) => {
    if (isSafeBookmarkUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Trigger Open Bookmark Manager
  const handleOpenManager = () => {
    if (source === 'favorites') {
      openBookmarkManager({ favoritesOnly: true });
    } else if (source === 'folder' && activeFolder) {
      openBookmarkManager({ groupId: activeFolder.id });
    } else if (source === 'uncategorized') {
      openBookmarkManager({ groupId: null });
    } else {
      openBookmarkManager();
    }
  };

  // Header badge label
  const renderHeaderBadge = () => {
    if (source === 'favorites') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          <span>{t('bookmarks.favorites')}</span>
        </Badge>
      );
    }
    if (source === 'uncategorized') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-muted-foreground">
          <Folder className="h-2.5 w-2.5" />
          <span>{t('bookmarks.uncategorized')}</span>
        </Badge>
      );
    }
    if (source === 'folder' && activeFolder) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] gap-1.5 px-1.5 py-0 truncate max-w-[120px]"
          title={activeFolder.title}
        >
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: activeFolder.color || '#3B82F6' }}
          />
          <span className="truncate">{activeFolder.title}</span>
        </Badge>
      );
    }
    if (isMissingFolder) {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 text-amber-500">
          <AlertCircle className="h-2.5 w-2.5" />
          <span>Folder Removed</span>
        </Badge>
      );
    }
    return null;
  };

  // Render empty state message based on active source
  const renderEmptyState = () => {
    if (source === 'favorites') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <div className="h-8 w-8 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mb-1.5">
            <Star className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-foreground">No favorites yet</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
            Star bookmarks in the manager to access them here quickly.
          </p>
          <Button variant="ghost" size="sm" onClick={handleOpenManager} className="h-7 text-xs">
            Open Bookmark Manager
          </Button>
        </div>
      );
    }

    if (source === 'folder' && activeFolder) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <div className="h-8 w-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mb-1.5">
            <Folder className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-foreground">
            Folder "{activeFolder.title}" is empty
          </p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
            Move or create bookmarks in this folder.
          </p>
          <Button variant="ghost" size="sm" onClick={handleOpenManager} className="h-7 text-xs">
            Manage Folder
          </Button>
        </div>
      );
    }

    if (source === 'uncategorized') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
          <p className="text-xs font-medium text-foreground">No uncategorized bookmarks</p>
          <Button variant="ghost" size="sm" onClick={handleOpenManager} className="h-7 text-xs mt-1.5">
            Open Manager
          </Button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-3 select-none">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5">
          <Bookmark className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium text-foreground">No bookmarks yet</p>
        <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5 mb-2">
          Save your favorite websites for quick access from your dashboard.
        </p>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3 w-3" />}
          onClick={handleOpenManager}
          className="h-7 text-xs"
        >
          Add Bookmark
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden text-xs select-none">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0 gap-2">
        {/* Left: Branding, Title & Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground text-xs truncate">
            {config?.title || 'Smart Bookmarks'}
          </span>
          {renderHeaderBadge()}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip content="Widget Settings" position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Smart Bookmarks Settings"
              onClick={() => setIsSettingsOpen(true)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" />
            </IconButton>
          </Tooltip>

          <Tooltip content="Open Bookmark Manager" position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Open Bookmark Manager"
              onClick={handleOpenManager}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && bookmarks.length === 0 ? (
          /* Loading Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-secondary/20"
              >
                <Skeleton className="h-6 w-6 rounded shrink-0 animate-shimmer" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4 rounded animate-shimmer" />
                  <Skeleton className="h-2 w-1/2 rounded animate-shimmer" />
                </div>
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
              onClick={() => loadBookmarks(workspaceId)}
              className="mt-2 text-xs h-7"
            >
              Retry
            </Button>
          </div>
        ) : displayedBookmarks.length === 0 ? (
          /* Empty State */
          renderEmptyState()
        ) : (
          /* Shortcut Tiles Grid */
          <div
            className={cn(
              'grid gap-2',
              compactDensity
                ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
            )}
          >
            {displayedBookmarks.map((bm) => {
              const domain = extractDomain(bm.url);
              return (
                <button
                  type="button"
                  key={bm.id}
                  onClick={() => handleOpenBookmark(bm.url)}
                  title={`${bm.title}\n${bm.url}`}
                  className={cn(
                    'group relative flex items-center rounded-lg border transition-all text-left focus:outline-none focus:ring-1 focus:ring-ring select-none overflow-hidden',
                    compactDensity
                      ? 'p-1.5 gap-1.5 border-border/40 bg-secondary/30 hover:bg-secondary/70 hover:border-border'
                      : 'p-2 gap-2.5 border-border/40 bg-secondary/30 hover:bg-secondary/70 hover:border-border shadow-xs'
                  )}
                >
                  <BookmarkFavicon url={bm.url} title={bm.title} />

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {bm.title}
                    </div>
                    {showDomain && domain && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {domain}
                      </div>
                    )}
                  </div>

                  {bm.isFavorite && (
                    <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 shrink-0 absolute top-1 right-1 opacity-80" />
                  )}
                </button>
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
          title="Smart Bookmarks Settings"
          description="Configure visible bookmarks and folder filtering."
          size="sm"
        >
          <SmartBookmarksWidgetSettings
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

export const SmartBookmarksWidget: WidgetDefinition<SmartBookmarksConfig> = {
  type: 'smart-bookmarks',
  name: 'Smart Bookmarks',
  description: 'Quick access to your saved website shortcuts and folders.',
  category: 'productivity',
  icon: Bookmark,
  defaultConfig: {
    source: 'all',
    folderId: null,
    maxItems: 8,
    showDomain: true,
    compactDensity: false,
  },
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  maxDimensions: { w: 12, h: 8 },
  component: SmartBookmarksWidgetComponent,
  settingsComponent: SmartBookmarksWidgetSettings,
};
