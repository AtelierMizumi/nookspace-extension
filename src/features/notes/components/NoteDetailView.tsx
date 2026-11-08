import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { useNoteStore } from '../stores/noteStore';
import { NoteEditor } from './NoteEditor';
import { Button } from '../../../components/ui/Button';

export function NoteDetailView() {
  const {
    notes,
    collections,
    tags,
    selectedNoteId,
    linkedBookmarks,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleFavorite,
    toggleArchive,
    linkBookmark,
    unlinkBookmark,
  } = useNoteStore();

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  if (!selectedNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50 dark:bg-slate-900/40 border-l border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          No Note Selected
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
          Select a note from the list to view or edit its contents, or create a new one.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => createNote({ title: 'Untitled Note', content: '' })}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </Button>
      </div>
    );
  }

  return (
    <NoteEditor
      note={selectedNote}
      collections={collections}
      tags={tags}
      linkedBookmarks={linkedBookmarks}
      onUpdate={async (id, updates) => {
        await updateNote(id, updates);
      }}
      onDelete={async (id) => {
        await deleteNote(id);
      }}
      onTogglePin={async (id) => {
        await togglePin(id);
      }}
      onToggleFavorite={async (id) => {
        await toggleFavorite(id);
      }}
      onToggleArchive={async (id) => {
        await toggleArchive(id);
      }}
      onLinkBookmark={async (bmId) => {
        await linkBookmark(selectedNote.id, bmId);
      }}
      onUnlinkBookmark={async (bmId) => {
        await unlinkBookmark(selectedNote.id, bmId);
      }}
    />
  );
}
