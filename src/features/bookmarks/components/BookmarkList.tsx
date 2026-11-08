import React from 'react';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { BookmarkSortField, SortDirection, BookmarkGroupFilter } from '../services/bookmarkSearchService';
import { BookmarkItem } from './BookmarkItem';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button, IconButton } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Bookmark,
  Search,
  ArrowUpDown,
  Plus,
  FolderOpen,
  X,
  Star,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export interface BookmarkListProps {
  bookmarks: BookmarkEntity[];
  groups: BookmarkGroupEntity[];
  groupFilter: BookmarkGroupFilter;
  showFavoritesOnly: boolean;
  searchQuery: string;
  sortBy: BookmarkSortField;
  sortDirection: SortDirection;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onClearSearch: () => void;
  onSetSortBy: (sortBy: BookmarkSortField) => void;
  onSetSortDirection: (direction: SortDirection) => void;
  onOpenBookmark: (bookmark: BookmarkEntity) => void;
  onToggleFavorite: (id: string) => void;
  onEditBookmark: (bookmark: BookmarkEntity) => void;
  onMoveBookmark: (bookmark: BookmarkEntity) => void;
  onDeleteBookmark: (id: string) => void;
  onCreateNote?: (bookmark: BookmarkEntity) => void;
  linkedNotesMap?: Record<string, number>;
  onReorderBookmarks?: (orderedIds: string[], groupId: string | null) => void;
  onAddBookmark: () => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  groups,
  groupFilter,
  showFavoritesOnly,
  searchQuery,
  sortBy,
  sortDirection,
  isLoading,
  error,
  onClearError,
  onClearSearch,
  onSetSortBy,
  onSetSortDirection,
  onOpenBookmark,
  onToggleFavorite,
  onEditBookmark,
  onMoveBookmark,
  onDeleteBookmark,
  onCreateNote,
  linkedNotesMap = {},
  onReorderBookmarks,
  onAddBookmark,
}) => {
  // Determine view title
  let viewTitle = 'All Bookmarks';
  let viewIcon = <Bookmark className="h-4 w-4 text-primary" />;

  if (showFavoritesOnly) {
    viewTitle = 'Favorites';
    viewIcon = <Star className="h-4 w-4 text-amber-400 fill-current" />;
  } else if (groupFilter.type === 'uncategorized') {
    viewTitle = 'Uncategorized';
    viewIcon = <Inbox className="h-4 w-4 text-primary" />;
  } else if (groupFilter.type === 'group') {
    const activeGroup = groups.find((g) => g.id === groupFilter.groupId);
    viewTitle = activeGroup?.title || 'Folder';
    viewIcon = (
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: activeGroup?.color || '#3B82F6' }}
      />
    );
  }

  // Create group lookup map for badge display
  const groupMap = new Map(groups.map((g) => [g.id, g.title]));

  // Reorder handlers
  const canReorder = !searchQuery && (groupFilter.type === 'group' || groupFilter.type === 'uncategorized');
  const targetGroupId = groupFilter.type === 'group' ? groupFilter.groupId : null;

  const handleMoveItemUp = (index: number) => {
    if (!onReorderBookmarks || index <= 0) return;
    const newItems = [...bookmarks];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    onReorderBookmarks(newItems.map((b) => b.id), targetGroupId);
  };

  const handleMoveItemDown = (index: number) => {
    if (!onReorderBookmarks || index >= bookmarks.length - 1) return;
    const newItems = [...bookmarks];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    onReorderBookmarks(newItems.map((b) => b.id), targetGroupId);
  };

  // Drag and drop reordering
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !onReorderBookmarks) {
      setDraggedIndex(null);
      return;
    }
    const newItems = [...bookmarks];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, movedItem);
    setDraggedIndex(null);
    onReorderBookmarks(newItems.map((b) => b.id), targetGroupId);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
      {/* List Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 gap-3">
        {/* Title & Count */}
        <div className="flex items-center gap-2.5 min-w-0">
          {viewIcon}
          <div className="flex items-baseline gap-2 truncate">
            <h2 className="text-sm font-semibold text-foreground truncate">{viewTitle}</h2>
            <span className="text-[11px] text-muted-foreground shrink-0">
              ({bookmarks.length})
            </span>
          </div>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Search Pill */}
          {searchQuery && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border/60 text-[11px] text-foreground">
              <span className="text-muted-foreground">Search:</span>
              <span className="font-medium max-w-[100px] truncate">"{searchQuery}"</span>
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search query"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={sortBy}
              aria-label="Sort bookmarks by"
              onChange={(e) => onSetSortBy(e.target.value as BookmarkSortField)}
              className="h-7 rounded border border-border/70 bg-card px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="order">Manual Order</option>
              <option value="title">Title (A-Z)</option>
              <option value="createdAt">Date Created</option>
              <option value="updatedAt">Date Updated</option>
            </select>

            <IconButton
              size="sm"
              variant="outline"
              aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              onClick={() => onSetSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 text-muted-foreground hover:text-foreground text-[11px]"
              title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Error notification banner */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-destructive hover:opacity-80 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="h-full flex items-center justify-center py-12">
            {searchQuery ? (
              <EmptyState
                icon={<Search className="h-6 w-6 text-muted-foreground" />}
                title="No matching bookmarks"
                description={`No bookmarks found matching "${searchQuery}".`}
                action={
                  <Button variant="secondary" size="sm" onClick={onClearSearch}>
                    Clear Search
                  </Button>
                }
              />
            ) : showFavoritesOnly ? (
              <EmptyState
                icon={<Star className="h-6 w-6 text-amber-400" />}
                title="No favorite bookmarks"
                description="Click the star icon on any bookmark to add it to your favorites."
              />
            ) : groupFilter.type === 'uncategorized' ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6 text-muted-foreground" />}
                title="No uncategorized bookmarks"
                description="All your bookmarks are organized into folders."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={onAddBookmark}
                  >
                    Add Bookmark
                  </Button>
                }
              />
            ) : groupFilter.type === 'group' ? (
              <EmptyState
                icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
                title="This folder is empty"
                description="Save relevant bookmarks directly into this folder."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={onAddBookmark}
                  >
                    Add to this folder
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Bookmark className="h-6 w-6 text-primary" />}
                title="No bookmarks yet"
                description="Start saving important websites, documentation, and tools to your workspace."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={onAddBookmark}
                  >
                    Add First Bookmark
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div role="list" className="space-y-1.5">
            {bookmarks.map((bm, index) => (
              <BookmarkItem
                key={bm.id}
                bookmark={bm}
                groupName={bm.groupId ? groupMap.get(bm.groupId) : undefined}
                linkedNotesCount={linkedNotesMap[bm.id]}
                onOpen={onOpenBookmark}
                onToggleFavorite={onToggleFavorite}
                onEdit={onEditBookmark}
                onMove={onMoveBookmark}
                onDelete={onDeleteBookmark}
                onCreateNote={onCreateNote}
                onMoveUp={canReorder ? () => handleMoveItemUp(index) : undefined}
                onMoveDown={canReorder ? () => handleMoveItemDown(index) : undefined}
                canMoveUp={index > 0}
                canMoveDown={index < bookmarks.length - 1}
                isDraggable={canReorder}
                onDragStart={canReorder ? handleDragStart(index) : undefined}
                onDragOver={canReorder ? handleDragOver(index) : undefined}
                onDrop={canReorder ? handleDrop(index) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
