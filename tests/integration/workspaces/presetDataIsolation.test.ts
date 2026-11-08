import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { NookSpaceDB } from '@/services/database/db';
import { PresetApplicationService } from '@/features/workspaces/services/presetApplicationService';
import '@/widgets';

describe('Preset Data Isolation — Integration Tests', () => {
  let testDb: NookSpaceDB;
  let service: PresetApplicationService;

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-preset-isolation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    service = new PresetApplicationService(testDb);
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
  });

  it('1. creating a workspace from a preset does not duplicate or bleed existing user domain data', async () => {
    // 1. Setup Source Workspace with user content
    const sourceWsId = 'ws-source-user';
    await testDb.workspaces.add({
      id: sourceWsId,
      name: 'Source Workspace',
      icon: 'Home',
      isDefault: true,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Add user note
    await testDb.notes.add({
      id: 'note-1',
      workspaceId: sourceWsId,
      title: 'Confidential Notes',
      content: '# Secret Recipe',
      excerpt: 'Secret Recipe',
      collectionId: null,
      tags: ['secret'],
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Add user collection
    await testDb.noteCollections.add({
      id: 'col-1',
      workspaceId: sourceWsId,
      title: 'Work Collection',
      color: '#6366f1',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Add user bookmark
    await testDb.bookmarks.add({
      id: 'bm-1',
      workspaceId: sourceWsId,
      title: 'Private Intranet',
      url: 'https://intranet.corp',
      groupId: null,
      isFavorite: false,
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Add user todo
    await testDb.todos.add({
      id: 'todo-1',
      workspaceId: sourceWsId,
      title: 'Deploy to Production',
      completed: false,
      priority: 'high',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Add user focus session
    await testDb.focusSessions.add({
      id: 'focus-1',
      workspaceId: sourceWsId,
      durationMinutes: 45,
      type: 'pomodoro',
      startedAt: 955,
      completedAt: 1000,
      completed: true,
    });

    // Add user daily goal
    await testDb.dailyGoals.add({
      id: 'goal-1',
      workspaceId: sourceWsId,
      title: 'Finish Milestone 8.5',
      targetValue: 1,
      currentValue: 1,
      dateString: '2026-11-07',
      createdAt: 1000,
      updatedAt: 1000,
    });

    // 2. Create new workspace from 'deep-study' preset
    const newWs = await service.createWorkspaceFromPreset({
      presetId: 'deep-study',
      name: 'Isolated Deep Study Space',
    });

    expect(newWs.id).not.toBe(sourceWsId);

    // 3. Verify zero user domain records in the new workspace
    const newNotes = await testDb.notes.where('workspaceId').equals(newWs.id).toArray();
    const newCollections = await testDb.noteCollections.where('workspaceId').equals(newWs.id).toArray();
    const newBookmarks = await testDb.bookmarks.where('workspaceId').equals(newWs.id).toArray();
    const newTodos = await testDb.todos.where('workspaceId').equals(newWs.id).toArray();
    const newSessions = await testDb.focusSessions.where('workspaceId').equals(newWs.id).toArray();
    const newGoals = await testDb.dailyGoals.where('workspaceId').equals(newWs.id).toArray();

    expect(newNotes).toHaveLength(0);
    expect(newCollections).toHaveLength(0);
    expect(newBookmarks).toHaveLength(0);
    expect(newTodos).toHaveLength(0);
    expect(newSessions).toHaveLength(0);
    expect(newGoals).toHaveLength(0);

    // 4. Verify source workspace data remains 100% intact
    const sourceNotes = await testDb.notes.where('workspaceId').equals(sourceWsId).toArray();
    const sourceBookmarks = await testDb.bookmarks.where('workspaceId').equals(sourceWsId).toArray();
    const sourceTodos = await testDb.todos.where('workspaceId').equals(sourceWsId).toArray();

    expect(sourceNotes).toHaveLength(1);
    expect(sourceNotes[0].title).toBe('Confidential Notes');
    expect(sourceBookmarks).toHaveLength(1);
    expect(sourceBookmarks[0].title).toBe('Private Intranet');
    expect(sourceTodos).toHaveLength(1);
    expect(sourceTodos[0].title).toBe('Deploy to Production');
  });

  it('2. creating multiple workspaces from the same preset yields completely independent IDs and layout structures', async () => {
    const ws1 = await service.createWorkspaceFromPreset({
      presetId: 'developer',
      name: 'Developer Workspace 1',
    });

    const ws2 = await service.createWorkspaceFromPreset({
      presetId: 'developer',
      name: 'Developer Workspace 2',
    });

    expect(ws1.id).not.toBe(ws2.id);

    const instances1 = await testDb.widgetInstances.where('workspaceId').equals(ws1.id).toArray();
    const instances2 = await testDb.widgetInstances.where('workspaceId').equals(ws2.id).toArray();

    expect(instances1).toHaveLength(6);
    expect(instances2).toHaveLength(6);

    const ids1 = new Set(instances1.map((i) => i.id));
    const ids2 = new Set(instances2.map((i) => i.id));

    // Intersection must be empty
    for (const id of ids1) {
      expect(ids2.has(id)).toBe(false);
    }

    const layouts1 = await testDb.widgetLayouts.where('workspaceId').equals(ws1.id).toArray();
    const layouts2 = await testDb.widgetLayouts.where('workspaceId').equals(ws2.id).toArray();

    expect(layouts1).toHaveLength(30);
    expect(layouts2).toHaveLength(30);

    const layoutIds1 = new Set(layouts1.map((l) => l.id));
    const layoutIds2 = new Set(layouts2.map((l) => l.id));

    for (const id of layoutIds1) {
      expect(layoutIds2.has(id)).toBe(false);
    }
  });
});
