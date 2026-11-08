import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NookSpaceDB } from '../../../src/services/database/db';
import { TodoRepository } from '../../../src/services/database/repositories/todoRepository';
import { FocusSessionRepository } from '../../../src/services/database/repositories/focusSessionRepository';
import { DailyGoalRepository } from '../../../src/services/database/repositories/dailyGoalRepository';
import { BookmarkRepository } from '../../../src/features/bookmarks/repositories/bookmarkRepository';
import { BookmarkGroupRepository } from '../../../src/features/bookmarks/repositories/bookmarkGroupRepository';
import { NoteRepository } from '../../../src/features/notes/repositories/noteRepository';
import { NoteCollectionRepository } from '../../../src/features/notes/repositories/noteCollectionRepository';
import { NoteTagRepository } from '../../../src/features/notes/repositories/noteTagRepository';
import { NoteBookmarkLinkRepository } from '../../../src/features/notes/repositories/noteBookmarkLinkRepository';

describe('Milestone 8.3 — Workspace Domain Data Isolation Suite', () => {
  let testDb: NookSpaceDB;
  let todoRepo: TodoRepository;
  let focusRepo: FocusSessionRepository;
  let goalRepo: DailyGoalRepository;
  let bookmarkRepo: BookmarkRepository;
  let bookmarkGroupRepo: BookmarkGroupRepository;
  let noteRepo: NoteRepository;
  let noteCollectionRepo: NoteCollectionRepository;
  let noteTagRepo: NoteTagRepository;
  let noteLinkRepo: NoteBookmarkLinkRepository;

  const wsA = 'ws-domain-iso-a';
  const wsB = 'ws-domain-iso-b';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-domain-iso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();

    todoRepo = new TodoRepository(testDb);
    focusRepo = new FocusSessionRepository(testDb);
    goalRepo = new DailyGoalRepository(testDb);
    bookmarkRepo = new BookmarkRepository(testDb);
    bookmarkGroupRepo = new BookmarkGroupRepository(testDb);
    noteRepo = new NoteRepository(testDb);
    noteCollectionRepo = new NoteCollectionRepository(testDb);
    noteTagRepo = new NoteTagRepository(testDb);
    noteLinkRepo = new NoteBookmarkLinkRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('1. Todo Isolation: querying workspace A returns only A todos, excluding B todos', async () => {
    await todoRepo.create({ workspaceId: wsA, title: 'Todo in Space A' });
    await todoRepo.create({ workspaceId: wsB, title: 'Todo in Space B' });

    const aTodos = await todoRepo.getByFilter(wsA);
    const bTodos = await todoRepo.getByFilter(wsB);

    expect(aTodos).toHaveLength(1);
    expect(aTodos[0].title).toBe('Todo in Space A');
    expect(bTodos).toHaveLength(1);
    expect(bTodos[0].title).toBe('Todo in Space B');
  });

  it('2. Focus Sessions & Goals Isolation: records are partitioned strictly by workspaceId', async () => {
    const now = Date.now();
    await focusRepo.create({
      workspaceId: wsA,
      type: 'pomodoro',
      durationMinutes: 25,
      startedAt: now - 1500000,
      completedAt: now,
      completed: true,
    });
    await focusRepo.create({
      workspaceId: wsB,
      type: 'study',
      durationMinutes: 50,
      startedAt: now - 3000000,
      completedAt: now,
      completed: true,
    });

    const aSessions = await focusRepo.getByWorkspace(wsA);
    const bSessions = await focusRepo.getByWorkspace(wsB);

    expect(aSessions).toHaveLength(1);
    expect(aSessions[0].durationMinutes).toBe(25);
    expect(bSessions).toHaveLength(1);
    expect(bSessions[0].durationMinutes).toBe(50);
  });

  it('3. Smart Bookmarks & Folders Isolation: searching or listing in workspace A never exposes workspace B records', async () => {
    const groupA = await bookmarkGroupRepo.create({ workspaceId: wsA, title: 'Folder A' });
    const groupB = await bookmarkGroupRepo.create({ workspaceId: wsB, title: 'Folder B' });

    await bookmarkRepo.create({
      workspaceId: wsA,
      title: 'Bookmark in A',
      url: 'https://example.com/a',
      groupId: groupA.id,
    });
    await bookmarkRepo.create({
      workspaceId: wsB,
      title: 'Bookmark in B',
      url: 'https://example.com/b',
      groupId: groupB.id,
    });

    const aBookmarks = await bookmarkRepo.getByWorkspace(wsA);
    const bBookmarks = await bookmarkRepo.getByWorkspace(wsB);
    const aGroups = await bookmarkGroupRepo.getByWorkspace(wsA);
    const bGroups = await bookmarkGroupRepo.getByWorkspace(wsB);

    expect(aBookmarks).toHaveLength(1);
    expect(aBookmarks[0].title).toBe('Bookmark in A');
    expect(bBookmarks).toHaveLength(1);
    expect(bBookmarks[0].title).toBe('Bookmark in B');

    expect(aGroups).toHaveLength(1);
    expect(aGroups[0].title).toBe('Folder A');
    expect(bGroups).toHaveLength(1);
    expect(bGroups[0].title).toBe('Folder B');
  });

  it('4. Notes, Collections & Tags Isolation: searching or listing notes in workspace A isolates titles and content from workspace B', async () => {
    const colA = await noteCollectionRepo.create({ workspaceId: wsA, title: 'Collection A' });
    const colB = await noteCollectionRepo.create({ workspaceId: wsB, title: 'Collection B' });

    const tagA = await noteTagRepo.create({ workspaceId: wsA, name: 'alpha' });
    const tagB = await noteTagRepo.create({ workspaceId: wsB, name: 'beta' });

    await noteRepo.create({
      workspaceId: wsA,
      collectionId: colA.id,
      title: 'Deep Work Note A',
      content: '# Note A content',
      tags: [tagA.name],
    });
    await noteRepo.create({
      workspaceId: wsB,
      collectionId: colB.id,
      title: 'Deep Work Note B',
      content: '# Note B content',
      tags: [tagB.name],
    });

    const aNotes = await noteRepo.getByWorkspace(wsA);
    const bNotes = await noteRepo.getByWorkspace(wsB);
    const aCols = await noteCollectionRepo.getByWorkspace(wsA);
    const bCols = await noteCollectionRepo.getByWorkspace(wsB);
    const aTags = await noteTagRepo.getByWorkspace(wsA);
    const bTags = await noteTagRepo.getByWorkspace(wsB);

    expect(aNotes).toHaveLength(1);
    expect(aNotes[0].title).toBe('Deep Work Note A');
    expect(bNotes).toHaveLength(1);
    expect(bNotes[0].title).toBe('Deep Work Note B');

    expect(aCols).toHaveLength(1);
    expect(aCols[0].title).toBe('Collection A');
    expect(bCols).toHaveLength(1);
    expect(bCols[0].title).toBe('Collection B');

    expect(aTags).toHaveLength(1);
    expect(aTags[0].name).toBe('alpha');
    expect(bTags).toHaveLength(1);
    expect(bTags[0].name).toBe('beta');
  });

  it('5. Bookmark ↔ Note Link Isolation: cannot link a bookmark and note from different workspaces', async () => {
    const bA = await bookmarkRepo.create({ workspaceId: wsA, title: 'Book A', url: 'https://a.com' });
    const nA = await noteRepo.create({ workspaceId: wsA, title: 'Note A' });
    const nB = await noteRepo.create({ workspaceId: wsB, title: 'Note B' });

    // Valid link within wsA
    const validLink = await noteLinkRepo.create({
      workspaceId: wsA,
      noteId: nA.id,
      bookmarkId: bA.id,
    });
    expect(validLink.workspaceId).toBe(wsA);

    // Cross-workspace link attempt: linking note B (wsB) with bookmark A (wsA) under wsB is blocked
    await expect(
      noteLinkRepo.create({
        workspaceId: wsB,
        noteId: nB.id,
        bookmarkId: bA.id,
      })
    ).rejects.toThrow(/Bookmark with id .* not found in workspace/i);

    // Linking note A (wsA) with bookmark A (wsA) under wsB is blocked
    await expect(
      noteLinkRepo.create({
        workspaceId: wsB,
        noteId: nA.id,
        bookmarkId: bA.id,
      })
    ).rejects.toThrow(/Note with id .* not found in workspace/i);

    // Verify linked bookmarks
    const aLinked = await noteLinkRepo.getLinkedBookmarksForNote(wsA, nA.id);
    expect(aLinked).toHaveLength(1);
    expect(aLinked[0].id).toBe(bA.id);

    const bLinked = await noteLinkRepo.getLinkedBookmarksForNote(wsB, nB.id);
    expect(bLinked).toHaveLength(0);
  });
});
