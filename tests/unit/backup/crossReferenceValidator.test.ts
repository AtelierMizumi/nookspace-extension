import { describe, it, expect } from 'vitest';
import { validateCrossReferencesAndDomainIntegrity } from '../../../src/features/backup/validation/crossReferenceValidator';
import type { BackupDataV1 } from '../../../src/features/backup/types/backupTypes';

function createMinimalValidData(): BackupDataV1 {
  return {
    workspaces: [
      {
        id: 'ws-default',
        name: 'Default Workspace',
        icon: 'LayoutGrid',
        order: 0,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    settings: {
      id: 'current_settings',
      activeWorkspaceId: 'ws-default',
      theme: 'dark',
      accentColor: '#3b82f6',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#0f172a',
      widgetOpacity: 90,
      widgetBlur: 10,
      updatedAt: 1000,
    },
    widgetInstances: [
      {
        id: 'inst-1',
        widgetType: 'clock',
        workspaceId: 'ws-default',
        title: 'Clock',
        config: {},
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    widgetLayouts: [
      {
        id: 'ws-default_inst-1_lg',
        workspaceId: 'ws-default',
        widgetInstanceId: 'inst-1',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        isDefault: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    todos: [],
    notes: [
      {
        id: 'note-1',
        workspaceId: 'ws-default',
        collectionId: 'col-1',
        title: 'Sample Note',
        content: 'Content here',
        excerpt: 'Content here',
        tags: ['sample'],
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    noteCollections: [
      {
        id: 'col-1',
        workspaceId: 'ws-default',
        title: 'General',
        color: '#6366f1',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    noteTags: [],
    noteBookmarkLinks: [
      {
        id: 'link-1',
        workspaceId: 'ws-default',
        noteId: 'note-1',
        bookmarkId: 'bm-1',
        createdAt: 1000,
      },
    ],
    bookmarks: [
      {
        id: 'bm-1',
        workspaceId: 'ws-default',
        groupId: 'group-1',
        title: 'GitHub',
        url: 'https://github.com',
        isFavorite: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    bookmarkGroups: [
      {
        id: 'group-1',
        workspaceId: 'ws-default',
        title: 'Dev Links',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    focusSessions: [],
    dailyGoals: [],
    stickyNotes: [],
    vocabulary: [],
    resources: [
      {
        id: 'res-1',
        title: 'React Docs',
        url: 'https://react.dev',
        tags: [],
        isPinned: false,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    calendarEvents: [],
  };
}

describe('crossReferenceValidator', () => {
  it('passes on clean, consistent data', () => {
    const data = createMinimalValidData();
    const { errors, warnings } = validateCrossReferencesAndDomainIntegrity(data);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  describe('workspace integrity', () => {
    it('reports error when workspaces array is empty', () => {
      const data = createMinimalValidData();
      data.workspaces = [];
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'NO_WORKSPACES_FOUND');
      expect(found).toHaveLength(1);
    });

    it('reports warning when no default workspace exists', () => {
      const data = createMinimalValidData();
      data.workspaces[0].isDefault = false;
      const { warnings } = validateCrossReferencesAndDomainIntegrity(data);
      const found = warnings.filter((i) => i.code === 'MISSING_DEFAULT_WORKSPACE');
      expect(found).toHaveLength(1);
    });

    it('reports error on duplicate workspace IDs', () => {
      const data = createMinimalValidData();
      data.workspaces.push({
        id: 'ws-default', // duplicate
        name: 'Workspace 2',
        icon: 'LayoutGrid',
        order: 1,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'DUPLICATE_WORKSPACE_ID');
      expect(found.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('orphan entity detection', () => {
    it('flags widget instance referencing non-existent workspace', () => {
      const data = createMinimalValidData();
      data.widgetInstances[0].workspaceId = 'ws-ghost';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'ORPHAN_WIDGET_INSTANCE');
      expect(found).toHaveLength(1);
      expect(found[0].path).toBe('$.data.widgetInstances[0].workspaceId');
    });

    it('flags layout referencing non-existent workspace', () => {
      const data = createMinimalValidData();
      data.widgetLayouts[0].workspaceId = 'ws-ghost';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'ORPHAN_WIDGET_LAYOUT_WORKSPACE');
      expect(found).toHaveLength(1);
    });

    it('flags note referencing non-existent workspace', () => {
      const data = createMinimalValidData();
      data.notes[0].workspaceId = 'ws-ghost';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'ORPHAN_NOTE');
      expect(found).toHaveLength(1);
    });

    it('flags bookmark referencing non-existent workspace', () => {
      const data = createMinimalValidData();
      data.bookmarks[0].workspaceId = 'ws-ghost';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'ORPHAN_BOOKMARK');
      expect(found).toHaveLength(1);
    });
  });

  describe('cross-workspace mismatch detection', () => {
    it('flags note referencing collection from another workspace', () => {
      const data = createMinimalValidData();
      data.workspaces.push({
        id: 'ws-second',
        name: 'Second',
        icon: 'LayoutGrid',
        order: 1,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });
      data.noteCollections.push({
        id: 'col-second',
        workspaceId: 'ws-second',
        title: 'Second Col',
        color: '#ff0000',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });
      // Note is in ws-default but collection is in ws-second
      data.notes[0].collectionId = 'col-second';

      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'CROSS_WORKSPACE_COLLECTION_MISMATCH');
      expect(found).toHaveLength(1);
    });

    it('flags bookmark referencing group from another workspace', () => {
      const data = createMinimalValidData();
      data.workspaces.push({
        id: 'ws-second',
        name: 'Second',
        icon: 'LayoutGrid',
        order: 1,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });
      data.bookmarkGroups.push({
        id: 'group-second',
        workspaceId: 'ws-second',
        title: 'Second Group',
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });
      // Bookmark is in ws-default but group is in ws-second
      data.bookmarks[0].groupId = 'group-second';

      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'CROSS_WORKSPACE_GROUP_MISMATCH');
      expect(found).toHaveLength(1);
    });

    it('flags layout item referencing instance from another workspace', () => {
      const data = createMinimalValidData();
      data.workspaces.push({
        id: 'ws-second',
        name: 'Second',
        icon: 'LayoutGrid',
        order: 1,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });
      data.widgetInstances.push({
        id: 'inst-second',
        widgetType: 'notes',
        workspaceId: 'ws-second',
        title: 'Notes',
        config: {},
        isEnabled: true,
        order: 1,
        createdAt: 1000,
        updatedAt: 1000,
      });
      // Layout in ws-default references inst-second in ws-second
      data.widgetLayouts.push({
        id: 'ws-default_inst-second_lg',
        workspaceId: 'ws-default',
        widgetInstanceId: 'inst-second',
        breakpoint: 'lg',
        x: 4,
        y: 0,
        w: 4,
        h: 4,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });

      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'CROSS_WORKSPACE_LAYOUT_MISMATCH');
      expect(found).toHaveLength(1);
    });

    it('flags note-bookmark link across workspaces', () => {
      const data = createMinimalValidData();
      data.workspaces.push({
        id: 'ws-second',
        name: 'Second',
        icon: 'LayoutGrid',
        order: 1,
        isDefault: false,
        createdAt: 1000,
        updatedAt: 1000,
      });
      data.bookmarks.push({
        id: 'bm-second',
        workspaceId: 'ws-second',
        groupId: null,
        title: 'Second Link',
        url: 'https://example.com',
        isFavorite: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      });
      // Link links note-1 (ws-default) and bm-second (ws-second)
      data.noteBookmarkLinks[0].bookmarkId = 'bm-second';

      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'CROSS_WORKSPACE_NOTE_BOOKMARK_LINK');
      expect(found).toHaveLength(1);
    });
  });

  describe('dangerous URL scheme detection', () => {
    it('flags javascript: URLs in bookmarks as errors', () => {
      const data = createMinimalValidData();
      data.bookmarks[0].url = 'javascript:alert("pwned")';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'DANGEROUS_BOOKMARK_URL_SCHEME');
      expect(found).toHaveLength(1);
    });

    it('flags data: URLs in bookmarks as errors', () => {
      const data = createMinimalValidData();
      data.bookmarks[0].url = 'data:text/html,<script>alert(1)</script>';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'DANGEROUS_BOOKMARK_URL_SCHEME');
      expect(found).toHaveLength(1);
    });

    it('flags vbscript: URLs in study resources as errors', () => {
      const data = createMinimalValidData();
      data.resources[0].url = 'vbscript:MsgBox("test")';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const found = errors.filter((i) => i.code === 'DANGEROUS_RESOURCE_URL_SCHEME');
      expect(found).toHaveLength(1);
    });

    it('allows valid http, https, and mailto URLs', () => {
      const data = createMinimalValidData();
      data.bookmarks[0].url = 'https://nookspace.app/docs';
      data.resources[0].url = 'http://localhost:3000';
      const { errors } = validateCrossReferencesAndDomainIntegrity(data);
      const urlErrors = errors.filter(
        (i) => i.code === 'DANGEROUS_BOOKMARK_URL_SCHEME' || i.code === 'DANGEROUS_RESOURCE_URL_SCHEME'
      );
      expect(urlErrors).toHaveLength(0);
    });
  });
});
