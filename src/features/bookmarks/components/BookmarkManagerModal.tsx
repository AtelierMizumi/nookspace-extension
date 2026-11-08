import React, { useState, useEffect, useRef } from 'react';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { isSafeBookmarkUrl } from '../utils/bookmarkSecurity';
import { FolderSidebar } from './FolderSidebar';
import { BookmarkList } from './BookmarkList';
import {
  BookmarkFormModal,
  FolderFormModal,
  DeleteFolderModal,
  MoveBookmarkModal,
} from './BookmarkDialogs';
import { BookmarkImportExportDialog } from './BookmarkImportExportDialog';
import { Input } from '../../../components/ui/Input';
import { Button, IconButton } from '../../../components/ui/Button';
import { Bookmark, Search, Plus, FolderPlus, ArrowUpDown, X } from 'lucide-react';
import { useNoteStore } from '../../notes/stores/noteStore';
import { noteBookmarkLinkRepository } from '../../notes/repositories/noteBookmarkLinkRepository';

export interface BookmarkManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export const BookmarkManagerModal: React.FC<BookmarkManagerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [mobileView, setMobileView] = useState<'sidebar' | 'list'>('list');
  const { activeWorkspaceId: storeWorkspaceId } = useWorkspaceStore();
  const effectiveWorkspaceId = workspaceId || storeWorkspaceId;

  // Bookmark store state & actions
  const {
    bookmarks,
    groups,
    isLoading,
    error,
    searchQuery,
    groupFilter,
    showFavoritesOnly,
    sortBy,
    sortDirection,
    initialize,
    setSearchQuery,
    selectAllGroups,
    selectUncategorized,
    selectGroup,
    setShowFavoritesOnly,
    setSortBy,
    setSortDirection,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    toggleFavorite,
    reorderBookmarks,
    moveBookmark,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    clearError,
    getFilteredBookmarks,
  } = useBookmarkStore();

  // Dialog states
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkEntity | null>(null);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<BookmarkGroupEntity | null>(null);

  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<BookmarkGroupEntity | null>(null);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingBookmark, setMovingBookmark] = useState<BookmarkEntity | null>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [linkedNotesMap, setLinkedNotesMap] = useState<Record<string, number>>({});

  // Sync workspace data on mount / workspace change
  useEffect(() => {
    if (isOpen && effectiveWorkspaceId) {
      initialize(effectiveWorkspaceId);
    }
  }, [isOpen, effectiveWorkspaceId, initialize]);

  // Load linked notes counts for bookmarks
  useEffect(() => {
    if (!isOpen || !effectiveWorkspaceId || bookmarks.length === 0) {
      setLinkedNotesMap({});
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const counts: Record<string, number> = {};
        await Promise.all(
          bookmarks.map(async (bm) => {
            const links = await noteBookmarkLinkRepository.getByBookmark(effectiveWorkspaceId, bm.id);
            if (links.length > 0) {
              counts[bm.id] = links.length;
            }
          })
        );
        if (isMounted) setLinkedNotesMap(counts);
      } catch (err) {
        console.error('Failed to load linked notes counts:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveWorkspaceId, bookmarks]);

  const handleCreateNoteFromBookmark = async (bookmark: BookmarkEntity) => {
    try {
      const note = await useNoteStore.getState().createNoteFromBookmark(bookmark);
      window.dispatchEvent(
        new CustomEvent('nookspace:open-notes-manager', { detail: { noteId: note.id } })
      );
    } catch (err) {
      console.error('Failed to create note from bookmark:', err);
    }
  };

  // Focus management: save active element, restore on close, autofocus on open, trap Tab
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            const searchOrInput = modalRef.current.querySelector<HTMLElement>('input:not([disabled])');
            if (searchOrInput) {
              searchOrInput.focus();
            } else {
              focusable[0].focus();
            }
          }
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        const hasSubModalOpen =
          isBookmarkModalOpen ||
          isFolderModalOpen ||
          isDeleteFolderModalOpen ||
          isMoveModalOpen ||
          isImportExportOpen;

        if (e.key === 'Escape') {
          if (!hasSubModalOpen) {
            e.preventDefault();
            onClose();
          }
        } else if (e.key === 'Tab' && modalRef.current && !hasSubModalOpen) {
          const focusable = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null);

          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (
              document.activeElement === first ||
              !modalRef.current.contains(document.activeElement)
            ) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (
              document.activeElement === last ||
              !modalRef.current.contains(document.activeElement)
            ) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        if (
          previousActiveElement.current &&
          typeof previousActiveElement.current.focus === 'function'
        ) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [
    isOpen,
    isBookmarkModalOpen,
    isFolderModalOpen,
    isDeleteFolderModalOpen,
    isMoveModalOpen,
    isImportExportOpen,
    onClose,
  ]);

  if (!isOpen) return null;

  // Filtered bookmark results computed reactively
  const filteredBookmarks = getFilteredBookmarks();

  // Navigation handlers
  const handleSelectAll = () => {
    setShowFavoritesOnly(false);
    selectAllGroups();
    setMobileView('list');
  };

  const handleSelectFavorites = () => {
    setShowFavoritesOnly(true);
    selectAllGroups();
    setMobileView('list');
  };

  const handleSelectUncategorized = () => {
    setShowFavoritesOnly(false);
    selectUncategorized();
    setMobileView('list');
  };

  const handleSelectGroup = (groupId: string) => {
    setShowFavoritesOnly(false);
    selectGroup(groupId);
    setMobileView('list');
  };

  // Bookmark actions
  const handleOpenBookmark = (bm: BookmarkEntity) => {
    if (isSafeBookmarkUrl(bm.url)) {
      window.open(bm.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCreateBookmarkClick = () => {
    setEditingBookmark(null);
    setIsBookmarkModalOpen(true);
  };

  const handleEditBookmarkClick = (bm: BookmarkEntity) => {
    setEditingBookmark(bm);
    setIsBookmarkModalOpen(true);
  };

  const handleSaveBookmark = async (input: {
    title: string;
    url: string;
    description?: string;
    groupId: string | null;
    isFavorite: boolean;
  }) => {
    if (editingBookmark) {
      await updateBookmark(editingBookmark.id, input);
    } else {
      await createBookmark(input);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    await deleteBookmark(id);
  };

  const handleMoveBookmarkClick = (bm: BookmarkEntity) => {
    setMovingBookmark(bm);
    setIsMoveModalOpen(true);
  };

  // Folder actions
  const handleCreateFolderClick = () => {
    setEditingFolder(null);
    setIsFolderModalOpen(true);
  };

  const handleRenameFolderClick = (folder: BookmarkGroupEntity) => {
    setEditingFolder(folder);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async (title: string, color?: string, icon?: string) => {
    if (editingFolder) {
      await renameGroup(editingFolder.id, title);
    } else {
      await createGroup({ title, color, icon });
    }
  };

  const handleDeleteFolderClick = (folder: BookmarkGroupEntity) => {
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const handleConfirmDeleteFolder = async (mode: 'reassign' | 'cascade') => {
    if (!folderToDelete) return;
    await deleteGroup(folderToDelete.id, { mode });
  };

  // Affected count for folder delete dialog
  const affectedCount = folderToDelete
    ? bookmarks.filter((b) => b.groupId === folderToDelete.id).length
    : 0;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bookmark Manager"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
          onClick={onClose}
        />

        {/* Manager Modal Window */}
        <div
          ref={modalRef}
          className="relative w-full max-w-5xl h-[85vh] max-h-[760px] min-h-[480px] z-50 rounded-xl border border-border bg-card text-card-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Bar Header */}
          <header className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card/80 shrink-0 gap-4">
            {/* Left: Branding & Title & Mobile View Switcher */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <Bookmark className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-foreground select-none hidden xs:inline">
                Bookmark Manager
              </span>
              <Button
                variant={mobileView === 'sidebar' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMobileView(mobileView === 'sidebar' ? 'list' : 'sidebar')}
                className="h-7 text-xs px-2 md:hidden"
                aria-label={mobileView === 'sidebar' ? 'View bookmarks' : 'View folders'}
              >
                {mobileView === 'sidebar' ? 'Bookmarks' : 'Folders'}
              </Button>
            </div>

            {/* Middle: Integrated Search Bar */}
            <div className="flex-1 max-w-md mx-auto">
              <Input
                leftIcon={<Search className="h-3.5 w-3.5" />}
                rightIcon={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null
                }
                placeholder="Search by title, domain, URL, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-secondary/50"
              />
            </div>

            {/* Right: Action Buttons & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleCreateBookmarkClick}
                className="h-8 text-xs font-medium"
              >
                Add Bookmark
              </Button>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
                onClick={handleCreateFolderClick}
                className="h-8 text-xs font-medium hidden sm:inline-flex"
              >
                New Folder
              </Button>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowUpDown className="h-3.5 w-3.5" />}
                onClick={() => setIsImportExportOpen(true)}
                className="h-8 text-xs font-medium hidden md:inline-flex"
              >
                Import / Export
              </Button>

              <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />

              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Close Bookmark Manager"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          </header>

          {/* Manager Content: Sidebar + List */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Folder Sidebar */}
            <FolderSidebar
              className={mobileView === 'sidebar' ? 'w-full flex md:w-60' : 'hidden md:flex'}
              groups={groups}
              bookmarks={bookmarks}
              groupFilter={groupFilter}
              showFavoritesOnly={showFavoritesOnly}
              onSelectAll={handleSelectAll}
              onSelectFavorites={handleSelectFavorites}
              onSelectUncategorized={handleSelectUncategorized}
              onSelectGroup={handleSelectGroup}
              onCreateFolder={handleCreateFolderClick}
              onRenameFolder={handleRenameFolderClick}
              onDeleteFolder={handleDeleteFolderClick}
              onReorderGroups={reorderGroups}
            />

            {/* Bookmark Content Panel */}
            <div className={mobileView === 'sidebar' ? 'hidden md:flex flex-1 min-w-0' : 'flex-1 min-w-0 flex'}>
              <BookmarkList
                bookmarks={filteredBookmarks}
                groups={groups}
                groupFilter={groupFilter}
                showFavoritesOnly={showFavoritesOnly}
                searchQuery={searchQuery}
                sortBy={sortBy}
                sortDirection={sortDirection}
                isLoading={isLoading}
                error={error}
                onClearError={clearError}
                onClearSearch={() => setSearchQuery('')}
                onSetSortBy={setSortBy}
                onSetSortDirection={setSortDirection}
                onOpenBookmark={handleOpenBookmark}
                onToggleFavorite={toggleFavorite}
                onEditBookmark={handleEditBookmarkClick}
                onMoveBookmark={handleMoveBookmarkClick}
                onDeleteBookmark={handleDeleteBookmark}
                onCreateNote={handleCreateNoteFromBookmark}
                linkedNotesMap={linkedNotesMap}
                onReorderBookmarks={reorderBookmarks}
                onAddBookmark={handleCreateBookmarkClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <BookmarkFormModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        initialBookmark={editingBookmark}
        defaultGroupId={groupFilter.type === 'group' ? groupFilter.groupId : null}
        groups={groups}
        onSubmit={handleSaveBookmark}
      />

      <FolderFormModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        initialFolder={editingFolder}
        onSubmit={handleSaveFolder}
      />

      <DeleteFolderModal
        isOpen={isDeleteFolderModalOpen}
        onClose={() => setIsDeleteFolderModalOpen(false)}
        folder={folderToDelete}
        affectedCount={affectedCount}
        onConfirm={handleConfirmDeleteFolder}
      />

      <MoveBookmarkModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        bookmark={movingBookmark}
        groups={groups}
        onMove={async (id, target) => {
          await moveBookmark(id, target);
        }}
      />

      <BookmarkImportExportDialog
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        workspaceId={effectiveWorkspaceId}
      />
    </>
  );
};
