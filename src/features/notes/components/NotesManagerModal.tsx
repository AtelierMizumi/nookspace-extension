import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../stores/noteStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { NoteCollectionEntity, NoteTagEntity } from '../../../types/notes';
import { NotesSidebar } from './NotesSidebar';
import { NotesNoteList } from './NotesNoteList';
import { NoteDetailView } from './NoteDetailView';
import {
  CollectionFormModal,
  DeleteCollectionModal,
  TagFormModal,
  DeleteTagModal,
} from './NotesDialogs';
import { X, ChevronLeft, BookOpen } from 'lucide-react';

export interface NotesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export type MobileActivePanel = 'sidebar' | 'list' | 'editor';

export function NotesManagerModal({ isOpen, onClose, workspaceId }: NotesManagerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { activeWorkspaceId: storeWorkspaceId } = useWorkspaceStore();
  const effectiveWorkspaceId = workspaceId || storeWorkspaceId;

  const {
    notes,
    collections,
    tags,
    selectedNoteId,
    searchQuery,
    viewFilter,
    selectedTag,
    sortBy,
    sortDirection,
    initialize,
    selectNote,
    setSearchQuery,
    setViewFilter,
    setSelectedTag,
    setSortBy,
    setSortDirection,
    createNote,
    deleteNote,
    togglePin,
    toggleFavorite,
    toggleArchive,
    createCollection,
    updateCollection,
    deleteCollection,
    createTag,
    updateTag,
    deleteTag,
    getFilteredNotes,
  } = useNoteStore();

  // Mobile navigation state
  const [mobilePanel, setMobilePanel] = useState<MobileActivePanel>('list');

  // Dialog states
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [colToEdit, setColToEdit] = useState<NoteCollectionEntity | null>(null);

  const [isDeleteColModalOpen, setIsDeleteColModalOpen] = useState(false);
  const [colToDelete, setColToDelete] = useState<NoteCollectionEntity | null>(null);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<NoteTagEntity | null>(null);

  const [isDeleteTagModalOpen, setIsDeleteTagModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<NoteTagEntity | null>(null);

  // Initialize store on open
  useEffect(() => {
    if (isOpen && effectiveWorkspaceId) {
      initialize(effectiveWorkspaceId);
    }
  }, [isOpen, effectiveWorkspaceId, initialize]);

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
          isColModalOpen || isDeleteColModalOpen || isTagModalOpen || isDeleteTagModalOpen;

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
    isColModalOpen,
    isDeleteColModalOpen,
    isTagModalOpen,
    isDeleteTagModalOpen,
    onClose,
  ]);

  if (!isOpen) return null;

  const filteredNotes = getFilteredNotes();

  const handleCreateNote = async () => {
    let targetColId: string | null = null;
    if (viewFilter.type === 'collection') {
      targetColId = viewFilter.collectionId;
    }
    const created = await createNote({
      title: 'Untitled Note',
      content: '',
      collectionId: targetColId,
      tags: selectedTag ? [selectedTag] : [],
    });
    selectNote(created.id);
    setMobilePanel('editor');
  };

  const handleSelectNote = (id: string) => {
    selectNote(id);
    setMobilePanel('editor');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notes & Knowledge Manager"
        className="relative w-full max-w-6xl h-[90vh] max-h-[850px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 select-none">
          <div className="flex items-center gap-2">
            {/* Mobile Back Button */}
            {mobilePanel !== 'sidebar' && (
              <button
                type="button"
                onClick={() => {
                  if (mobilePanel === 'editor') setMobilePanel('list');
                  else if (mobilePanel === 'list') setMobilePanel('sidebar');
                }}
                aria-label={mobilePanel === 'editor' ? 'Back to notes list' : 'Back to folders and tags'}
                className="md:hidden p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Notes & Knowledge
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Local-first Markdown notes & collections
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close notes manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Three-Panel Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Panel A: Sidebar (Hidden on mobile if not active) */}
          <div
            className={`h-full ${
              mobilePanel === 'sidebar' ? 'w-full block' : 'hidden md:block'
            }`}
          >
            <NotesSidebar
              notes={notes}
              collections={collections}
              tags={tags}
              viewFilter={viewFilter}
              selectedTag={selectedTag}
              onSelectView={(filter) => {
                setViewFilter(filter);
                setMobilePanel('list');
              }}
              onSelectTag={(tag) => {
                setSelectedTag(tag);
                setMobilePanel('list');
              }}
              onOpenCreateCollection={() => {
                setColToEdit(null);
                setIsColModalOpen(true);
              }}
              onOpenEditCollection={(col) => {
                setColToEdit(col);
                setIsColModalOpen(true);
              }}
              onOpenDeleteCollection={(col) => {
                setColToDelete(col);
                setIsDeleteColModalOpen(true);
              }}
              onOpenCreateTag={() => {
                setTagToEdit(null);
                setIsTagModalOpen(true);
              }}
              onOpenEditTag={(tag) => {
                setTagToEdit(tag);
                setIsTagModalOpen(true);
              }}
              onOpenDeleteTag={(tag) => {
                setTagToDelete(tag);
                setIsDeleteTagModalOpen(true);
              }}
            />
          </div>

          {/* Panel B: Note List (Hidden on mobile if not active) */}
          <div
            className={`h-full ${
              mobilePanel === 'list'
                ? 'w-full block'
                : mobilePanel === 'sidebar'
                ? 'hidden'
                : 'hidden lg:block'
            }`}
          >
            <NotesNoteList
              notes={filteredNotes}
              collections={collections}
              selectedNoteId={selectedNoteId}
              searchQuery={searchQuery}
              viewFilter={viewFilter}
              selectedTag={selectedTag}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSelectNote={handleSelectNote}
              onSearchChange={setSearchQuery}
              onSortByChange={setSortBy}
              onSortDirectionToggle={() =>
                setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
              }
              onCreateNote={handleCreateNote}
              onTogglePin={togglePin}
              onToggleFavorite={toggleFavorite}
              onToggleArchive={toggleArchive}
              onDeleteNote={deleteNote}
            />
          </div>

          {/* Panel C: Editor (Hidden on mobile/tablet if not active) */}
          <div
            className={`h-full flex-1 min-w-0 ${
              mobilePanel === 'editor'
                ? 'w-full block'
                : mobilePanel === 'list'
                ? 'hidden lg:block'
                : 'hidden'
            }`}
          >
            <NoteDetailView />
          </div>
        </div>
      </div>

      {/* Collection Dialogs */}
      <CollectionFormModal
        isOpen={isColModalOpen}
        onClose={() => setIsColModalOpen(false)}
        initialData={colToEdit}
        onSave={async (data) => {
          if (colToEdit) {
            await updateCollection(colToEdit.id, data);
          } else {
            await createCollection(data);
          }
        }}
      />

      <DeleteCollectionModal
        isOpen={isDeleteColModalOpen}
        onClose={() => setIsDeleteColModalOpen(false)}
        collection={colToDelete}
        noteCount={
          colToDelete ? notes.filter((n) => n.collectionId === colToDelete.id).length : 0
        }
        onConfirm={async (mode) => {
          if (colToDelete) {
            await deleteCollection(colToDelete.id, { mode });
          }
        }}
      />

      {/* Tag Dialogs */}
      <TagFormModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        initialData={tagToEdit}
        onSave={async (data) => {
          if (tagToEdit) {
            await updateTag(tagToEdit.id, data);
          } else {
            await createTag(data);
          }
        }}
      />

      <DeleteTagModal
        isOpen={isDeleteTagModalOpen}
        onClose={() => setIsDeleteTagModalOpen(false)}
        tag={tagToDelete}
        noteCount={
          tagToDelete
            ? notes.filter((n) => n.tags.includes(tagToDelete.name.toLowerCase())).length
            : 0
        }
        onConfirm={async () => {
          if (tagToDelete) {
            await deleteTag(tagToDelete.id);
          }
        }}
      />
    </div>
  );
}
