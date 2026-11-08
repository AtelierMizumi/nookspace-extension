import React from 'react';
import { Pin, Star, Archive, Trash2, Folder } from 'lucide-react';
import { NoteEntity, NoteCollectionEntity } from '../../../types/notes';

export interface NotesNoteListItemProps {
  note: NoteEntity;
  collection?: NoteCollectionEntity;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function NotesNoteListItem({
  note,
  collection,
  isSelected,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDelete,
}: NotesNoteListItemProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex flex-col p-3 rounded-xl cursor-pointer border text-left transition-all outline-none ${
        isSelected
          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500/50 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Header: Title and Indicators */}
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <h4
          className={`text-sm font-semibold truncate ${
            isSelected
              ? 'text-blue-900 dark:text-blue-200'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {note.title || 'Untitled Note'}
        </h4>

        <div className="flex items-center gap-1 shrink-0">
          {note.isPinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          )}
          {note.isFavorite && (
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          )}
          {note.isArchived && (
            <Archive className="w-3.5 h-3.5 text-purple-500" />
          )}
        </div>
      </div>

      {/* Excerpt preview */}
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
        {note.excerpt || 'Empty note...'}
      </p>

      {/* Footer: Date, Collection, Tags & Quick Actions */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span>{formatDate(note.updatedAt)}</span>

          {collection && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
              <span>·</span>
              <Folder className="w-2.5 h-2.5" />
              <span className="truncate max-w-[80px]">{collection.title}</span>
            </span>
          )}

          {note.tags.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
              <span>·</span>
              <span>#{note.tags[0]}</span>
              {note.tags.length > 1 && <span>+{note.tags.length - 1}</span>}
            </span>
          )}
        </div>

        {/* Quick action buttons on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
              note.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={note.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
              note.isFavorite ? 'text-yellow-500' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={note.isFavorite ? 'Remove Favorite' : 'Favorite'}
          >
            <Star className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
