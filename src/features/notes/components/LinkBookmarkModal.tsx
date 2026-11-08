import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bookmark,
  Search,
  Globe,
  Plus,
  Check,
  X,
  Star,
  Folder,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { bookmarkRepository } from '../../bookmarks/repositories/bookmarkRepository';
import { bookmarkGroupRepository } from '../../bookmarks/repositories/bookmarkGroupRepository';
import { extractDomain } from '../../bookmarks/services/bookmarkSearchService';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';
import { Modal } from '../../../components/ui/Modal';
import { Button, IconButton } from '../../../components/ui/Button';

export interface LinkBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteId: string;
  workspaceId: string;
  linkedBookmarkIds: string[];
  bookmarks?: BookmarkEntity[];
  groups?: BookmarkGroupEntity[];
  onLinkBookmark: (bookmarkId: string) => Promise<void>;
  onUnlinkBookmark: (bookmarkId: string) => Promise<void>;
}

export const LinkBookmarkModal: React.FC<LinkBookmarkModalProps> = ({
  isOpen,
  onClose,
  noteTitle,
  noteId: _noteId,
  workspaceId,
  linkedBookmarkIds,
  bookmarks: propBookmarks,
  groups: propGroups,
  onLinkBookmark,
  onUnlinkBookmark,
}) => {
  const [internalBookmarks, setInternalBookmarks] = useState<BookmarkEntity[]>([]);
  const [internalGroups, setInternalGroups] = useState<BookmarkGroupEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'favorites'>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const bookmarks = propBookmarks ?? internalBookmarks;
  const groups = propGroups ?? internalGroups;

  // Load bookmarks and groups on open if not provided as props
  useEffect(() => {
    if (!isOpen || !workspaceId || propBookmarks) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      bookmarkRepository.getByWorkspace(workspaceId),
      bookmarkGroupRepository.getByWorkspace(workspaceId),
    ])
      .then(([bms, grps]) => {
        if (!isMounted) return;
        setInternalBookmarks(bms);
        setInternalGroups(grps);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load bookmarks for linking:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId, propBookmarks]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedFolderId('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Create folder lookup
  const groupMap = useMemo(() => {
    return new Map(groups.map((g) => [g.id, g.title]));
  }, [groups]);

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (selectedFolderId === 'favorites') {
      result = result.filter((b) => b.isFavorite);
    } else if (selectedFolderId !== 'all') {
      result = result.filter((b) => b.groupId === selectedFolderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [bookmarks, selectedFolderId, searchQuery]);

  const handleToggleLink = async (bmId: string, isLinked: boolean) => {
    if (pendingIds.has(bmId)) return;

    setPendingIds((prev) => new Set(prev).add(bmId));
    try {
      if (isLinked) {
        await onUnlinkBookmark(bmId);
      } else {
        await onLinkBookmark(bmId);
      }
    } catch (err) {
      console.error('Failed to toggle bookmark link:', err);
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(bmId);
        return next;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link Bookmarks"
      description={`Attach related websites and bookmarks to "${noteTitle || 'Untitled Note'}".`}
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-3 -mt-1">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks by title or URL..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedFolderId('all')}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedFolderId === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            All ({bookmarks.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFolderId('favorites')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
              selectedFolderId === 'favorites'
                ? 'bg-amber-500 text-white'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Star className="h-3 w-3 fill-current" />
            Favorites
          </button>
          {groups.map((grp) => (
            <button
              key={grp.id}
              type="button"
              onClick={() => setSelectedFolderId(grp.id)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedFolderId === grp.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: grp.color || '#3B82F6' }}
              />
              {grp.title}
            </button>
          ))}
        </div>

        {/* Bookmarks List */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mb-2 text-primary" />
              <span>Loading bookmarks...</span>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Bookmark className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No bookmarks saved in this workspace</p>
              <p className="text-[11px] mt-0.5">
                Save bookmarks using Smart Bookmarks first, then link them here.
              </p>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Search className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No matching bookmarks</p>
              <p className="text-[11px] mt-0.5">Try searching with a different keyword or folder.</p>
            </div>
          ) : (
            filteredBookmarks.map((bm) => {
              const isLinked = linkedBookmarkIds.includes(bm.id);
              const isPending = pendingIds.has(bm.id);
              const domain = extractDomain(bm.url) || bm.url;
              const groupTitle = bm.groupId ? groupMap.get(bm.groupId) : undefined;

              return (
                <div
                  key={bm.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors gap-2.5 ${
                    isLinked
                      ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                      : 'border-border/50 bg-card hover:bg-secondary/30'
                  }`}
                >
                  {/* Left: Favicon & Details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="h-7 w-7 rounded bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                        alt=""
                        className="h-4 w-4 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <Globe className="h-3.5 w-3.5 text-muted-foreground -ml-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {bm.title}
                        </span>
                        {bm.isFavorite && (
                          <Star className="h-2.5 w-2.5 text-amber-400 fill-current shrink-0" />
                        )}
                        {groupTitle && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/40 shrink-0">
                            {groupTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                        <span>{domain}</span>
                        {bm.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{bm.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Link / Unlink Action */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSafeBookmarkUrl(bm.url) && (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Open bookmark link"
                        onClick={() => window.open(bm.url, '_blank', 'noopener,noreferrer')}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </IconButton>
                    )}

                    {isLinked ? (
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="h-3 w-3" />
                          <span>Linked</span>
                        </span>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Unlink bookmark"
                          disabled={isPending}
                          onClick={() => handleToggleLink(bm.id, true)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </IconButton>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleToggleLink(bm.id, false)}
                        leftIcon={
                          isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )
                        }
                        className="h-6 text-[11px] px-2"
                      >
                        Link
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
