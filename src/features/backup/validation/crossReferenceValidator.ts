import { BackupDataV1 } from '../types/backupTypes';
import { ValidationIssue } from '../types/validationTypes';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';

export function validateCrossReferencesAndDomainIntegrity(
  data: BackupDataV1,
  issues: { errors: ValidationIssue[]; warnings: ValidationIssue[] } = { errors: [], warnings: [] }
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const { errors, warnings } = issues;

  // 1. WORKSPACES INTEGRITY
  const workspaceIds = new Set<string>();
  let hasDefaultWorkspace = false;

  data.workspaces.forEach((ws, idx) => {
    if (workspaceIds.has(ws.id)) {
      errors.push({
        code: 'DUPLICATE_WORKSPACE_ID',
        severity: 'error',
        path: `$.data.workspaces[${idx}].id`,
        title: 'Duplicate Workspace ID',
        description: `Workspace with id "${ws.id}" is defined multiple times.`,
        table: 'workspaces',
        recordId: ws.id,
      });
    } else {
      workspaceIds.add(ws.id);
    }

    if (ws.isDefault) {
      hasDefaultWorkspace = true;
    }
  });

  if (data.workspaces.length === 0) {
    errors.push({
      code: 'NO_WORKSPACES_FOUND',
      severity: 'error',
      path: '$.data.workspaces',
      title: 'No Workspaces Found',
      description: 'The backup must contain at least one workspace.',
      table: 'workspaces',
    });
  } else if (!hasDefaultWorkspace) {
    warnings.push({
      code: 'MISSING_DEFAULT_WORKSPACE',
      severity: 'warning',
      path: '$.data.workspaces',
      title: 'Missing Default Workspace',
      description: 'None of the exported workspaces is marked as default. The first workspace will be promoted to default during restore.',
      table: 'workspaces',
    });
  }

  // 2. SETTINGS INTEGRITY
  if (data.settings) {
    if (data.settings.activeWorkspaceId && !workspaceIds.has(data.settings.activeWorkspaceId)) {
      warnings.push({
        code: 'INVALID_ACTIVE_WORKSPACE_REFERENCE',
        severity: 'warning',
        path: '$.data.settings.activeWorkspaceId',
        title: 'Invalid Active Workspace Reference',
        description: `Settings activeWorkspaceId "${data.settings.activeWorkspaceId}" does not exist in workspaces.`,
        table: 'settings',
      });
    }
  }

  // 3. WIDGET INSTANCES INTEGRITY
  const widgetInstanceIds = new Set<string>();
  const instanceWorkspaceMap = new Map<string, string>();

  data.widgetInstances.forEach((inst, idx) => {
    if (widgetInstanceIds.has(inst.id)) {
      errors.push({
        code: 'DUPLICATE_WIDGET_INSTANCE_ID',
        severity: 'error',
        path: `$.data.widgetInstances[${idx}].id`,
        title: 'Duplicate Widget Instance ID',
        description: `Widget instance id "${inst.id}" is duplicated.`,
        table: 'widgetInstances',
        recordId: inst.id,
      });
    } else {
      widgetInstanceIds.add(inst.id);
      instanceWorkspaceMap.set(inst.id, inst.workspaceId);
    }

    if (!workspaceIds.has(inst.workspaceId)) {
      errors.push({
        code: 'ORPHAN_WIDGET_INSTANCE',
        severity: 'error',
        path: `$.data.widgetInstances[${idx}].workspaceId`,
        title: 'Orphan Widget Instance',
        description: `Widget instance "${inst.id}" references non-existent workspace "${inst.workspaceId}".`,
        table: 'widgetInstances',
        recordId: inst.id,
      });
    }
  });

  // 4. WIDGET LAYOUTS INTEGRITY
  const layoutIds = new Set<string>();

  data.widgetLayouts.forEach((layout, idx) => {
    if (layoutIds.has(layout.id)) {
      errors.push({
        code: 'DUPLICATE_WIDGET_LAYOUT_ID',
        severity: 'error',
        path: `$.data.widgetLayouts[${idx}].id`,
        title: 'Duplicate Widget Layout ID',
        description: `Widget layout id "${layout.id}" is duplicated.`,
        table: 'widgetLayouts',
        recordId: layout.id,
      });
    } else {
      layoutIds.add(layout.id);
    }

    if (!workspaceIds.has(layout.workspaceId)) {
      errors.push({
        code: 'ORPHAN_WIDGET_LAYOUT_WORKSPACE',
        severity: 'error',
        path: `$.data.widgetLayouts[${idx}].workspaceId`,
        title: 'Orphan Widget Layout Workspace',
        description: `Widget layout "${layout.id}" references non-existent workspace "${layout.workspaceId}".`,
        table: 'widgetLayouts',
        recordId: layout.id,
      });
    }

    if (!widgetInstanceIds.has(layout.widgetInstanceId)) {
      errors.push({
        code: 'ORPHAN_WIDGET_LAYOUT_INSTANCE',
        severity: 'error',
        path: `$.data.widgetLayouts[${idx}].widgetInstanceId`,
        title: 'Orphan Widget Layout Instance',
        description: `Widget layout "${layout.id}" references non-existent widget instance "${layout.widgetInstanceId}".`,
        table: 'widgetLayouts',
        recordId: layout.id,
      });
    } else {
      const parentWs = instanceWorkspaceMap.get(layout.widgetInstanceId);
      if (parentWs && parentWs !== layout.workspaceId) {
        errors.push({
          code: 'CROSS_WORKSPACE_LAYOUT_MISMATCH',
          severity: 'error',
          path: `$.data.widgetLayouts[${idx}]`,
          title: 'Cross-Workspace Layout Mismatch',
          description: `Widget layout "${layout.id}" belongs to workspace "${layout.workspaceId}" but widget instance belongs to "${parentWs}".`,
          table: 'widgetLayouts',
          recordId: layout.id,
        });
      }
    }
  });

  // 5. NOTE COLLECTIONS INTEGRITY
  const collectionIds = new Set<string>();
  const collectionWorkspaceMap = new Map<string, string>();

  data.noteCollections.forEach((col, idx) => {
    if (collectionIds.has(col.id)) {
      errors.push({
        code: 'DUPLICATE_NOTE_COLLECTION_ID',
        severity: 'error',
        path: `$.data.noteCollections[${idx}].id`,
        title: 'Duplicate Note Collection ID',
        description: `Note collection id "${col.id}" is duplicated.`,
        table: 'noteCollections',
        recordId: col.id,
      });
    } else {
      collectionIds.add(col.id);
      collectionWorkspaceMap.set(col.id, col.workspaceId);
    }

    if (!workspaceIds.has(col.workspaceId)) {
      errors.push({
        code: 'ORPHAN_NOTE_COLLECTION',
        severity: 'error',
        path: `$.data.noteCollections[${idx}].workspaceId`,
        title: 'Orphan Note Collection',
        description: `Note collection "${col.id}" references non-existent workspace "${col.workspaceId}".`,
        table: 'noteCollections',
        recordId: col.id,
      });
    }
  });

  // 6. NOTES INTEGRITY
  const noteIds = new Set<string>();
  const noteWorkspaceMap = new Map<string, string>();

  data.notes.forEach((note, idx) => {
    if (noteIds.has(note.id)) {
      errors.push({
        code: 'DUPLICATE_NOTE_ID',
        severity: 'error',
        path: `$.data.notes[${idx}].id`,
        title: 'Duplicate Note ID',
        description: `Note id "${note.id}" is duplicated.`,
        table: 'notes',
        recordId: note.id,
      });
    } else {
      noteIds.add(note.id);
      noteWorkspaceMap.set(note.id, note.workspaceId);
    }

    if (!workspaceIds.has(note.workspaceId)) {
      errors.push({
        code: 'ORPHAN_NOTE',
        severity: 'error',
        path: `$.data.notes[${idx}].workspaceId`,
        title: 'Orphan Note',
        description: `Note "${note.id}" references non-existent workspace "${note.workspaceId}".`,
        table: 'notes',
        recordId: note.id,
      });
    }

    if (note.collectionId) {
      if (!collectionIds.has(note.collectionId)) {
        warnings.push({
          code: 'MISSING_NOTE_COLLECTION_REFERENCE',
          severity: 'warning',
          path: `$.data.notes[${idx}].collectionId`,
          title: 'Missing Note Collection Reference',
          description: `Note "${note.id}" references non-existent collection "${note.collectionId}". Collection can be reset to unassigned upon restore.`,
          table: 'notes',
          recordId: note.id,
        });
      } else {
        const colWs = collectionWorkspaceMap.get(note.collectionId);
        if (colWs && colWs !== note.workspaceId) {
          errors.push({
            code: 'CROSS_WORKSPACE_COLLECTION_MISMATCH',
            severity: 'error',
            path: `$.data.notes[${idx}]`,
            title: 'Cross-Workspace Collection Mismatch',
            description: `Note "${note.id}" in workspace "${note.workspaceId}" references collection "${note.collectionId}" in workspace "${colWs}".`,
            table: 'notes',
            recordId: note.id,
          });
        }
      }
    }
  });

  // 7. BOOKMARK GROUPS INTEGRITY
  const groupIds = new Set<string>();
  const groupWorkspaceMap = new Map<string, string>();

  data.bookmarkGroups.forEach((grp, idx) => {
    if (groupIds.has(grp.id)) {
      errors.push({
        code: 'DUPLICATE_BOOKMARK_GROUP_ID',
        severity: 'error',
        path: `$.data.bookmarkGroups[${idx}].id`,
        title: 'Duplicate Bookmark Group ID',
        description: `Bookmark group id "${grp.id}" is duplicated.`,
        table: 'bookmarkGroups',
        recordId: grp.id,
      });
    } else {
      groupIds.add(grp.id);
      groupWorkspaceMap.set(grp.id, grp.workspaceId);
    }

    if (!workspaceIds.has(grp.workspaceId)) {
      errors.push({
        code: 'ORPHAN_BOOKMARK_GROUP',
        severity: 'error',
        path: `$.data.bookmarkGroups[${idx}].workspaceId`,
        title: 'Orphan Bookmark Group',
        description: `Bookmark group "${grp.id}" references non-existent workspace "${grp.workspaceId}".`,
        table: 'bookmarkGroups',
        recordId: grp.id,
      });
    }
  });

  // 8. BOOKMARKS INTEGRITY
  const bookmarkIds = new Set<string>();
  const bookmarkWorkspaceMap = new Map<string, string>();

  data.bookmarks.forEach((bm, idx) => {
    if (bookmarkIds.has(bm.id)) {
      errors.push({
        code: 'DUPLICATE_BOOKMARK_ID',
        severity: 'error',
        path: `$.data.bookmarks[${idx}].id`,
        title: 'Duplicate Bookmark ID',
        description: `Bookmark id "${bm.id}" is duplicated.`,
        table: 'bookmarks',
        recordId: bm.id,
      });
    } else {
      bookmarkIds.add(bm.id);
      bookmarkWorkspaceMap.set(bm.id, bm.workspaceId);
    }

    if (!workspaceIds.has(bm.workspaceId)) {
      errors.push({
        code: 'ORPHAN_BOOKMARK',
        severity: 'error',
        path: `$.data.bookmarks[${idx}].workspaceId`,
        title: 'Orphan Bookmark',
        description: `Bookmark "${bm.id}" references non-existent workspace "${bm.workspaceId}".`,
        table: 'bookmarks',
        recordId: bm.id,
      });
    }

    if (bm.groupId) {
      if (!groupIds.has(bm.groupId)) {
        warnings.push({
          code: 'MISSING_BOOKMARK_GROUP_REFERENCE',
          severity: 'warning',
          path: `$.data.bookmarks[${idx}].groupId`,
          title: 'Missing Bookmark Group Reference',
          description: `Bookmark "${bm.id}" references non-existent group "${bm.groupId}". Group can be reset to unassigned upon restore.`,
          table: 'bookmarks',
          recordId: bm.id,
        });
      } else {
        const grpWs = groupWorkspaceMap.get(bm.groupId);
        if (grpWs && grpWs !== bm.workspaceId) {
          errors.push({
            code: 'CROSS_WORKSPACE_GROUP_MISMATCH',
            severity: 'error',
            path: `$.data.bookmarks[${idx}]`,
            title: 'Cross-Workspace Group Mismatch',
            description: `Bookmark "${bm.id}" in workspace "${bm.workspaceId}" references group "${bm.groupId}" in workspace "${grpWs}".`,
            table: 'bookmarks',
            recordId: bm.id,
          });
        }
      }
    }

    // URL security scheme check
    if (bm.url && !isSafeBookmarkUrl(bm.url)) {
      errors.push({
        code: 'DANGEROUS_BOOKMARK_URL_SCHEME',
        severity: 'error',
        path: `$.data.bookmarks[${idx}].url`,
        title: 'Dangerous Bookmark URL Scheme',
        description: `Bookmark "${bm.id}" contains an unsafe or executable URL scheme.`,
        table: 'bookmarks',
        recordId: bm.id,
      });
    }
  });

  // 9. NOTE-BOOKMARK JUNCTION INTEGRITY
  const linkKeys = new Set<string>();

  data.noteBookmarkLinks.forEach((link, idx) => {
    const pairKey = `${link.noteId}___${link.bookmarkId}`;
    if (linkKeys.has(pairKey)) {
      warnings.push({
        code: 'DUPLICATE_NOTE_BOOKMARK_JUNCTION',
        severity: 'warning',
        path: `$.data.noteBookmarkLinks[${idx}]`,
        title: 'Duplicate Note-Bookmark Junction',
        description: `Duplicate link between note "${link.noteId}" and bookmark "${link.bookmarkId}".`,
        table: 'noteBookmarkLinks',
        recordId: link.id,
      });
    } else {
      linkKeys.add(pairKey);
    }

    const noteWs = noteWorkspaceMap.get(link.noteId);
    const bmWs = bookmarkWorkspaceMap.get(link.bookmarkId);

    if (!noteWs) {
      errors.push({
        code: 'MISSING_NOTE_IN_BOOKMARK_LINK',
        severity: 'error',
        path: `$.data.noteBookmarkLinks[${idx}].noteId`,
        title: 'Missing Note in Bookmark Link',
        description: `Link "${link.id}" references non-existent note "${link.noteId}".`,
        table: 'noteBookmarkLinks',
        recordId: link.id,
      });
    }

    if (!bmWs) {
      errors.push({
        code: 'MISSING_BOOKMARK_IN_NOTE_LINK',
        severity: 'error',
        path: `$.data.noteBookmarkLinks[${idx}].bookmarkId`,
        title: 'Missing Bookmark in Note Link',
        description: `Link "${link.id}" references non-existent bookmark "${link.bookmarkId}".`,
        table: 'noteBookmarkLinks',
        recordId: link.id,
      });
    }

    if (noteWs && bmWs && (noteWs !== link.workspaceId || bmWs !== link.workspaceId)) {
      errors.push({
        code: 'CROSS_WORKSPACE_NOTE_BOOKMARK_LINK',
        severity: 'error',
        path: `$.data.noteBookmarkLinks[${idx}]`,
        title: 'Cross-Workspace Note Bookmark Link',
        description: `Link "${link.id}" specifies workspace "${link.workspaceId}", but note belongs to "${noteWs}" and bookmark belongs to "${bmWs}".`,
        table: 'noteBookmarkLinks',
        recordId: link.id,
      });
    }
  });

  // 10. PRODUCTIVITY & OTHER SCOPED TABLES
  const checkTableIds = (
    items: Array<{ id: string; workspaceId?: string }>,
    tableName: string
  ) => {
    const ids = new Set<string>();
    items.forEach((item, idx) => {
      if (ids.has(item.id)) {
        errors.push({
          code: `DUPLICATE_${tableName.toUpperCase()}_ID`,
          severity: 'error',
          path: `$.data.${tableName}[${idx}].id`,
          title: `Duplicate ID in ${tableName}`,
          description: `Entity in ${tableName} with id "${item.id}" is duplicated.`,
          table: tableName,
          recordId: item.id,
        });
      } else {
        ids.add(item.id);
      }

      if (item.workspaceId && !workspaceIds.has(item.workspaceId)) {
        errors.push({
          code: `ORPHAN_${tableName.toUpperCase()}_WORKSPACE`,
          severity: 'error',
          path: `$.data.${tableName}[${idx}].workspaceId`,
          title: `Orphan Record in ${tableName}`,
          description: `Record "${item.id}" in ${tableName} references non-existent workspace "${item.workspaceId}".`,
          table: tableName,
          recordId: item.id,
        });
      }
    });
  };

  checkTableIds(data.todos, 'todos');
  checkTableIds(data.focusSessions, 'focusSessions');
  checkTableIds(data.dailyGoals, 'dailyGoals');
  checkTableIds(data.stickyNotes, 'stickyNotes');
  checkTableIds(data.vocabulary, 'vocabulary');
  checkTableIds(data.resources, 'resources');
  checkTableIds(data.calendarEvents, 'calendarEvents');

  // Resource URL check
  data.resources.forEach((res, idx) => {
    if (res.url && !isSafeBookmarkUrl(res.url)) {
      errors.push({
        code: 'DANGEROUS_RESOURCE_URL_SCHEME',
        severity: 'error',
        path: `$.data.resources[${idx}].url`,
        title: 'Dangerous Resource URL Scheme',
        description: `Resource "${res.id}" contains an unsafe URL scheme.`,
        table: 'resources',
        recordId: res.id,
      });
    }
  });

  return issues;
}
