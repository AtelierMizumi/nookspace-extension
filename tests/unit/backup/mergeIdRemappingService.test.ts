import { describe, it, expect } from 'vitest';
import {
  MergeIdRemappingService,
  createRemappingContext,
  generateRemappedId,
} from '../../../src/features/backup/services/mergeIdRemappingService';

describe('Milestone 9.4 — Merge ID Remapping Service Suite', () => {
  const service = new MergeIdRemappingService();

  it('generates unique collision-free IDs with specified prefix', () => {
    const id1 = generateRemappedId('ws');
    const id2 = generateRemappedId('ws');
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('ws-')).toBe(true);
    expect(id2.startsWith('ws-')).toBe(true);
  });

  it('deeply remaps notes with foreign collectionId and workspaceId', () => {
    const context = createRemappingContext();
    service.registerIdMapping(context, 'workspaces', 'ws-old', 'ws-target');
    service.registerIdMapping(context, 'noteCollections', 'nc-old', 'nc-new');
    service.registerIdMapping(context, 'notes', 'note-old', 'note-new');

    const rawNote = {
      id: 'note-old',
      workspaceId: 'ws-old',
      collectionId: 'nc-old',
      title: 'Remapped Note',
      content: 'Hello world',
    };

    const remapped = service.remapEntity('notes', rawNote, context);
    expect(remapped.id).toBe('note-new');
    expect(remapped.workspaceId).toBe('ws-target');
    expect(remapped.collectionId).toBe('nc-new');
  });

  it('deeply remaps bookmarks with foreign groupId and workspaceId', () => {
    const context = createRemappingContext();
    service.registerIdMapping(context, 'workspaces', 'ws-source', 'ws-dest');
    service.registerIdMapping(context, 'bookmarkGroups', 'bg-source', 'bg-dest');
    service.registerIdMapping(context, 'bookmarks', 'bm-source', 'bm-dest');

    const rawBookmark = {
      id: 'bm-source',
      workspaceId: 'ws-source',
      groupId: 'bg-source',
      title: 'GitHub',
      url: 'https://github.com',
    };

    const remapped = service.remapEntity('bookmarks', rawBookmark, context);
    expect(remapped.id).toBe('bm-dest');
    expect(remapped.workspaceId).toBe('ws-dest');
    expect(remapped.groupId).toBe('bg-dest');
  });

  it('deeply remaps noteBookmarkLinks referencing remapped note and bookmark', () => {
    const context = createRemappingContext();
    service.registerIdMapping(context, 'workspaces', 'ws-1', 'ws-2');
    service.registerIdMapping(context, 'notes', 'note-1', 'note-2');
    service.registerIdMapping(context, 'bookmarks', 'bm-1', 'bm-2');
    service.registerIdMapping(context, 'noteBookmarkLinks', 'link-1', 'link-2');

    const rawLink = {
      id: 'link-1',
      workspaceId: 'ws-1',
      noteId: 'note-1',
      bookmarkId: 'bm-1',
    };

    const remapped = service.remapEntity('noteBookmarkLinks', rawLink, context);
    expect(remapped.id).toBe('link-2');
    expect(remapped.workspaceId).toBe('ws-2');
    expect(remapped.noteId).toBe('note-2');
    expect(remapped.bookmarkId).toBe('bm-2');
  });

  it('deeply remaps widgetLayouts compound ID from instanceId and workspaceId', () => {
    const context = createRemappingContext();
    service.registerIdMapping(context, 'workspaces', 'ws-old', 'ws-new');
    service.registerIdMapping(context, 'widgetInstances', 'wi-old', 'wi-new');

    const rawLayout = {
      id: 'ws-old_wi-old_lg',
      workspaceId: 'ws-old',
      widgetInstanceId: 'wi-old',
      breakpoint: 'lg',
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    };

    const remapped = service.remapEntity('widgetLayouts', rawLayout, context);
    expect(remapped.id).toBe('ws-new_wi-new_lg');
    expect(remapped.workspaceId).toBe('ws-new');
    expect(remapped.widgetInstanceId).toBe('wi-new');
  });

  it('forces isDefault: false on imported workspaces to preserve existing default', () => {
    const context = createRemappingContext();
    service.registerIdMapping(context, 'workspaces', 'ws-imp', 'ws-imp-mapped');

    const rawWs = {
      id: 'ws-imp',
      name: 'Imported WS',
      isDefault: true,
    };

    const remapped = service.remapEntity('workspaces', rawWs, context);
    expect(remapped.id).toBe('ws-imp-mapped');
    expect(remapped.isDefault).toBe(false);
  });
});
