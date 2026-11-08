// Notes & Knowledge Feature Exports
import { useNoteStore } from './stores/noteStore';

export * from './components';
export * from './stores/noteStore';
export * from './repositories';
export * from './services/noteSearchService';

export const EVENT_OPEN_NOTES_MANAGER = 'nookspace:open-notes-manager';

export interface OpenNotesManagerOptions {
  noteId?: string;
  collectionId?: string | null;
}

export function openNotesManager(options?: OpenNotesManagerOptions): void {
  if (options?.noteId) {
    useNoteStore.getState().selectNote(options.noteId);
  }
  if (options?.collectionId !== undefined) {
    if (options.collectionId === null) {
      useNoteStore.getState().setViewFilter({ type: 'uncategorized' });
    } else {
      useNoteStore.getState().setViewFilter({
        type: 'collection',
        collectionId: options.collectionId,
      });
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_OPEN_NOTES_MANAGER, { detail: options })
    );
  }
}
