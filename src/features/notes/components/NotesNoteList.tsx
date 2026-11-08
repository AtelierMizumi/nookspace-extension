import React from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  X,
  FileText,
  Pin,
  Star,
  Inbox,
  Archive,
  Folder,
  Tag as TagIcon,
} from 'lucide-react';
import { NoteEntity, NoteCollectionEntity } from '../../../types/notes';
import { NoteSortField, SortDirection, NoteViewFilter } from '../services/noteSearchService';
import { NotesNoteListItem } from './NotesNoteListItem';
import { Button } from '../../../components/ui/Button';

export interface NotesNoteListProps {
  notes: NoteEntity[];
  collections: NoteCollectionEntity[];
  selectedNoteId: string | null;
  searchQuery: string;
  viewFilter: NoteViewFilter;
  selectedTag: string | null;
  sortBy: NoteSortField;
  sortDirection: SortDirection;
  onSelectNote: (id: string) => void;
  onSearchChange: (query: string) => void;
  onSortByChange: (sortBy: NoteSortField) => void;
  onSortDirectionToggle: () => void;
  onCreateNote: () => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export function NotesNoteList({
  notes,
  collections,
  selectedNoteId,
  searchQuery,
  viewFilter,
  selectedTag,
  sortBy,
  sortDirection,
  onSelectNote,
  onSearchChange,
  onSortByChange,
  onSortDirectionToggle,
  onCreateNote,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDeleteNote,
}: NotesNoteListProps) {
  // Title derivation
  let viewTitle = 'All Notes';
  let viewIcon = <FileText className="w-4 h-4 text-blue-500" />;

  if (selectedTag) {
    viewTitle = `#${selectedTag}`;
    viewIcon = <TagIcon className="w-4 h-4 text-blue-500" />;
  } else {
    switch (viewFilter.type) {
      case 'pinned':
        viewTitle = 'Pinned Notes';
        viewIcon = <Pin className="w-4 h-4 text-amber-500" />;
        break;
      case 'favorites':
        viewTitle = 'Favorite Notes';
        viewIcon = <Star className="w-4 h-4 text-yellow-500" />;
        break;
      case 'uncategorized':
        viewTitle = 'Uncategorized';
        viewIcon = <Inbox className="w-4 h-4 text-slate-400" />;
        break;
      case 'archived':
        viewTitle = 'Archived Notes';
        viewIcon = <Archive className="w-4 h-4 text-purple-500" />;
        break;
      case 'collection': {
        const col = collections.find((c) => c.id === viewFilter.collectionId);
        viewTitle = col ? col.title : 'Collection';
        viewIcon = <Folder className="w-4 h-4 text-blue-500" />;
        break;
      }
      default:
        break;
    }
  }

  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  return (
    <div className="w-80 h-full flex flex-col bg-slate-50/40 dark:bg-slate-900/30 border-r border-slate-200 dark:border-slate-800">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {viewIcon}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {viewTitle}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {notes.length}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onCreateNote}
            className="flex items-center gap-1 h-7 text-xs px-2.5"
            title="Create Note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, content, tags..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-1">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as NoteSortField)}
              className="bg-transparent border-0 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:ring-0 p-0 cursor-pointer"
            >
              <option value="updatedAt">Modified</option>
              <option value="createdAt">Created</option>
              <option value="title">Title</option>
              <option value="order">Order</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onSortDirectionToggle}
            className="flex items-center gap-0.5 hover:text-slate-800 dark:hover:text-slate-200 px-1 py-0.5 rounded transition-colors"
            title={`Sort ${sortDirection === 'desc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="uppercase text-[9px]">{sortDirection}</span>
          </button>
        </div>
      </div>

      {/* Note List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400">
            <FileText className="w-8 h-8 opacity-40 mb-2" />
            {searchQuery ? (
              <>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No notes match "{searchQuery}"
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try checking your spelling or clear the search.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  No notes in this view
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "New" to write your first note.
                </p>
              </>
            )}
          </div>
        ) : (
          notes.map((note) => (
            <NotesNoteListItem
              key={note.id}
              note={note}
              collection={note.collectionId ? collectionMap.get(note.collectionId) : undefined}
              isSelected={selectedNoteId === note.id}
              onSelect={() => onSelectNote(note.id)}
              onTogglePin={(e) => {
                e.stopPropagation();
                onTogglePin(note.id);
              }}
              onToggleFavorite={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id);
              }}
              onToggleArchive={(e) => {
                e.stopPropagation();
                onToggleArchive(note.id);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
