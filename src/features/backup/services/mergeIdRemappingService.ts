/**
 * Entity ID Remapping Engine.
 * Responsible for generating collision-free IDs and applying deep foreign-key remapping
 * across all relational dependencies in NookSpace.
 */

export interface RemappingContext {
  workspaceIdMap: Map<string, string>;
  instanceIdMap: Map<string, string>;
  noteIdMap: Map<string, string>;
  collectionIdMap: Map<string, string>;
  tagIdMap: Map<string, string>;
  bookmarkIdMap: Map<string, string>;
  groupIdMap: Map<string, string>;
  todoIdMap: Map<string, string>;
  focusSessionIdMap: Map<string, string>;
  dailyGoalIdMap: Map<string, string>;
  stickyNoteIdMap: Map<string, string>;
  vocabularyIdMap: Map<string, string>;
  resourceIdMap: Map<string, string>;
  calendarEventIdMap: Map<string, string>;
  noteBookmarkLinkIdMap: Map<string, string>;
}

export function createRemappingContext(): RemappingContext {
  return {
    workspaceIdMap: new Map(),
    instanceIdMap: new Map(),
    noteIdMap: new Map(),
    collectionIdMap: new Map(),
    tagIdMap: new Map(),
    bookmarkIdMap: new Map(),
    groupIdMap: new Map(),
    todoIdMap: new Map(),
    focusSessionIdMap: new Map(),
    dailyGoalIdMap: new Map(),
    stickyNoteIdMap: new Map(),
    vocabularyIdMap: new Map(),
    resourceIdMap: new Map(),
    calendarEventIdMap: new Map(),
    noteBookmarkLinkIdMap: new Map(),
  };
}

let counter = 0;
export function generateRemappedId(prefix: string): string {
  counter += 1;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${time}-${rand}-${counter}`;
}

export class MergeIdRemappingService {
  /**
   * Registers a remapping for a primary entity ID.
   */
  registerIdMapping(
    context: RemappingContext,
    table: string,
    sourceId: string,
    targetId: string
  ): void {
    switch (table) {
      case 'workspaces':
        context.workspaceIdMap.set(sourceId, targetId);
        break;
      case 'widgetInstances':
        context.instanceIdMap.set(sourceId, targetId);
        break;
      case 'notes':
        context.noteIdMap.set(sourceId, targetId);
        break;
      case 'noteCollections':
        context.collectionIdMap.set(sourceId, targetId);
        break;
      case 'noteTags':
        context.tagIdMap.set(sourceId, targetId);
        break;
      case 'bookmarks':
        context.bookmarkIdMap.set(sourceId, targetId);
        break;
      case 'bookmarkGroups':
        context.groupIdMap.set(sourceId, targetId);
        break;
      case 'todos':
        context.todoIdMap.set(sourceId, targetId);
        break;
      case 'focusSessions':
        context.focusSessionIdMap.set(sourceId, targetId);
        break;
      case 'dailyGoals':
        context.dailyGoalIdMap.set(sourceId, targetId);
        break;
      case 'stickyNotes':
        context.stickyNoteIdMap.set(sourceId, targetId);
        break;
      case 'vocabulary':
        context.vocabularyIdMap.set(sourceId, targetId);
        break;
      case 'resources':
        context.resourceIdMap.set(sourceId, targetId);
        break;
      case 'calendarEvents':
        context.calendarEventIdMap.set(sourceId, targetId);
        break;
      case 'noteBookmarkLinks':
        context.noteBookmarkLinkIdMap.set(sourceId, targetId);
        break;
    }
  }

  /**
   * Deeply remaps an entity's foreign keys and primary key using the context.
   */
  remapEntity(
    table: string,
    entity: any,
    context: RemappingContext,
    targetWorkspaceId?: string
  ): any {
    const clone = JSON.parse(JSON.stringify(entity));

    // Resolve target workspace ID
    const effectiveWorkspaceId =
      targetWorkspaceId ||
      context.workspaceIdMap.get(clone.workspaceId) ||
      clone.workspaceId;

    switch (table) {
      case 'workspaces': {
        const targetId = context.workspaceIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        // Never import imported workspaces as default to protect existing default workspace
        clone.isDefault = false;
        return clone;
      }

      case 'widgetInstances': {
        const targetId = context.instanceIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'widgetLayouts': {
        const targetInstanceId =
          context.instanceIdMap.get(clone.widgetInstanceId) || clone.widgetInstanceId;
        clone.workspaceId = effectiveWorkspaceId;
        clone.widgetInstanceId = targetInstanceId;
        // Reconstruct compound layout ID
        clone.id = `${effectiveWorkspaceId}_${targetInstanceId}_${clone.breakpoint}`;
        return clone;
      }

      case 'notes': {
        const targetId = context.noteIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        if (clone.collectionId) {
          clone.collectionId =
            context.collectionIdMap.get(clone.collectionId) || clone.collectionId;
        }
        return clone;
      }

      case 'noteCollections': {
        const targetId = context.collectionIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'noteTags': {
        const targetId = context.tagIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'noteBookmarkLinks': {
        const targetId = context.noteBookmarkLinkIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        clone.noteId = context.noteIdMap.get(clone.noteId) || clone.noteId;
        clone.bookmarkId = context.bookmarkIdMap.get(clone.bookmarkId) || clone.bookmarkId;
        return clone;
      }

      case 'bookmarkGroups': {
        const targetId = context.groupIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'bookmarks': {
        const targetId = context.bookmarkIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        if (clone.groupId) {
          clone.groupId = context.groupIdMap.get(clone.groupId) || clone.groupId;
        }
        return clone;
      }

      case 'todos': {
        const targetId = context.todoIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'focusSessions': {
        const targetId = context.focusSessionIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'dailyGoals': {
        const targetId = context.dailyGoalIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'stickyNotes': {
        const targetId = context.stickyNoteIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'vocabulary': {
        const targetId = context.vocabularyIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'resources': {
        const targetId = context.resourceIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'calendarEvents': {
        const targetId = context.calendarEventIdMap.get(clone.id) || clone.id;
        clone.id = targetId;
        clone.workspaceId = effectiveWorkspaceId;
        return clone;
      }

      case 'settings': {
        // Keep ID current_settings
        clone.id = 'current_settings';
        return clone;
      }

      default:
        return clone;
    }
  }
}
