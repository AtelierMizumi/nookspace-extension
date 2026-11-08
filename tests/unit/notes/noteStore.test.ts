import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { NoteRepository } from '../../../src/features/notes/repositories/noteRepository';
import { NoteCollectionRepository } from '../../../src/features/notes/repositories/noteCollectionRepository';
import { NoteTagRepository } from '../../../src/features/notes/repositories/noteTagRepository';
import { createNoteStore } from '../../../src/features/notes/stores/noteStore';
import { browserApi } from '../../../src/services/browser';

describe('NoteStore Suite', () => {
  let db: NookSpaceDB;
  let notesRepo: NoteRepository;
  let collectionsRepo: NoteCollectionRepository;
  let tagsRepo: NoteTagRepository;
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  beforeEach(async () => {
    db = new NookSpaceDB(`test-note-store-${Date.now()}-${Math.random()}`);
    await db.open();

    notesRepo = new NoteRepository(db);
    collectionsRepo = new NoteCollectionRepository(db);
    tagsRepo = new NoteTagRepository(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('1. initializes store, loads workspace data and selects the first note', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });

    // Seed data
    const col = await collectionsRepo.create({ workspaceId: ws1, title: 'Col 1' });
    const note = await notesRepo.create({ workspaceId: ws1, title: 'Note 1', content: 'Body' });
    const tag = await tagsRepo.create({ workspaceId: ws1, name: 'idea' });

    await store.getState().initialize(ws1);

    const state = store.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.activeWorkspaceId).toBe(ws1);
    expect(state.notes.length).toBe(1);
    expect(state.collections.length).toBe(1);
    expect(state.tags.length).toBe(1);
    expect(state.selectedNoteId).toBe(note.id);
  });

  it('2. creates, updates, and deletes notes with store synchronization', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);

    // Create
    const note = await store.getState().createNote({
      title: 'Store Created Note',
      content: 'Hello World',
    });

    expect(note.id).toBeDefined();
    expect(store.getState().notes.length).toBe(1);
    expect(store.getState().selectedNoteId).toBe(note.id);

    // Update
    const updated = await store.getState().updateNote(note.id, {
      title: 'Updated Note Title',
    });
    expect(updated.title).toBe('Updated Note Title');
    expect(store.getState().notes[0].title).toBe('Updated Note Title');

    // Delete
    const deleted = await store.getState().deleteNote(note.id);
    expect(deleted).toBe(true);
    expect(store.getState().notes.length).toBe(0);
    expect(store.getState().selectedNoteId).toBeNull();
  });

  it('3. toggles note pin, favorite, and archive states', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);

    const note = await store.getState().createNote({ title: 'Toggle Test' });

    const pinned = await store.getState().togglePin(note.id);
    expect(pinned.isPinned).toBe(true);
    expect(store.getState().notes[0].isPinned).toBe(true);

    const fav = await store.getState().toggleFavorite(note.id);
    expect(fav.isFavorite).toBe(true);

    const arch = await store.getState().toggleArchive(note.id);
    expect(arch.isArchived).toBe(true);
  });

  it('4. manages collections in store', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);

    const col = await store.getState().createCollection({ title: 'My Folder' });
    expect(store.getState().collections.length).toBe(1);

    const updatedCol = await store.getState().updateCollection(col.id, { title: 'Renamed Folder' });
    expect(updatedCol.title).toBe('Renamed Folder');

    const result = await store.getState().deleteCollection(col.id);
    expect(result.deleted).toBe(true);
    expect(store.getState().collections.length).toBe(0);
  });

  it('5. manages tags in store', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);

    const tag = await store.getState().createTag({ name: 'productivity' });
    expect(store.getState().tags.length).toBe(1);

    const updatedTag = await store.getState().updateTag(tag.id, { name: 'deep-work' });
    expect(updatedTag.name).toBe('deep-work');

    const deleted = await store.getState().deleteTag(tag.id);
    expect(deleted).toBe(true);
    expect(store.getState().tags.length).toBe(0);
  });

  it('6. provides filtered and searched notes via getFilteredNotes selector', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);

    await store.getState().createNote({ title: 'Apple Guide', content: 'About iOS' });
    await store.getState().createNote({ title: 'Banana Guide', content: 'About Android' });

    expect(store.getState().getFilteredNotes().length).toBe(2);

    // Search query
    store.getState().setSearchQuery('apple');
    expect(store.getState().getFilteredNotes().length).toBe(1);
    expect(store.getState().getFilteredNotes()[0].title).toBe('Apple Guide');
  });

  it('7. switches active workspace cleanly and resets state', async () => {
    const store = createNoteStore({ notesRepo, collectionsRepo, tagsRepo });
    await store.getState().initialize(ws1);
    await store.getState().createNote({ title: 'WS1 Note' });

    await store.getState().setActiveWorkspace(ws2);
    expect(store.getState().activeWorkspaceId).toBe(ws2);
    expect(store.getState().notes.length).toBe(0);
  });
});
