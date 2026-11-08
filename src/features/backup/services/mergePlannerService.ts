import { NookSpaceDB, db as defaultDb } from '../../../services/database/db';
import type { BackupDataV1, NookSpaceUniversalBackupV1 } from '../types/backupTypes';
import {
  MergeDataGroup,
  MergeImportOptions,
  MergeImportPreview,
  MergeImportPlan,
  MergeConflict,
  MergeConflictPolicy,
  DATA_GROUP_TABLE_MAP,
} from '../types/mergeTypes';
import { computeEntityFingerprint } from './mergeFingerprintService';
import {
  MergeIdRemappingService,
  createRemappingContext,
  generateRemappedId,
} from './mergeIdRemappingService';
import { MergeDependencyService } from './mergeDependencyService';
import { validateBackup } from './backupValidationService';

export class MergePlannerService {
  private remappingSvc: MergeIdRemappingService;
  private dependencySvc: MergeDependencyService;

  constructor(private database: NookSpaceDB = defaultDb) {
    this.remappingSvc = new MergeIdRemappingService();
    this.dependencySvc = new MergeDependencyService();
  }

  /**
   * Generates a read-only preview of what would be imported, discovering duplicates and conflicts.
   * Guarantees 0 database writes.
   */
  async generatePreview(
    backupInput: NookSpaceUniversalBackupV1 | string | object,
    options: MergeImportOptions
  ): Promise<MergeImportPreview> {
    // 1. Validate backup structure
    const validation = await validateBackup(backupInput, {
      skipChecksumVerification: options.skipChecksumVerification,
    });

    if (!validation.isValid || !validation.canonicalBackup) {
      throw new Error(
        `Backup validation failed: ${validation.errors.map((e) => `${e.path} (${e.code}): ${e.description || e.title}`).join('; ')}`
      );
    }

    const backup = validation.canonicalBackup;
    const backupData = backup.data;
    const selectedGroups = options.selectedGroups;

    // 2. Dependency analysis
    const depResult = this.dependencySvc.analyzeDependencies(
      selectedGroups,
      backupData,
      options.targetWorkspaceId
    );

    // 3. Read current database counts and records in scope
    const incomingCounts: Record<string, number> = {};
    const existingCounts: Record<string, number> = {};
    const existingRecordsByTable: Record<string, any[]> = {};
    const existingFingerprintsByTable: Record<string, Set<string>> = {};
    const existingIdsByTable: Record<string, Set<string>> = {};

    let totalIncomingCount = 0;
    let duplicateCount = 0;
    let idCollisionCount = 0;
    const conflicts: MergeConflict[] = [];

    // Evaluate target workspace mode
    let targetWorkspaceMode: 'into_existing' | 'create_new' | 'preserve_source' =
      'preserve_source';
    let targetWorkspaceName: string | undefined;

    if (options.targetWorkspaceId) {
      targetWorkspaceMode = 'into_existing';
      const targetWs = await this.database.workspaces.get(options.targetWorkspaceId);
      if (!targetWs) {
        throw new Error(`Target workspace "${options.targetWorkspaceId}" was not found.`);
      }
      targetWorkspaceName = targetWs.name;
    } else if (options.createNewWorkspaceForImport) {
      targetWorkspaceMode = 'create_new';
      targetWorkspaceName = options.newWorkspaceName || 'Imported Workspace';
    }

    // Inspect each table in scope
    for (const group of selectedGroups) {
      const tables = DATA_GROUP_TABLE_MAP[group] || [];
      for (const table of tables) {
        const incoming = (backupData as any)[table] || [];
        const incomingArray = Array.isArray(incoming)
          ? incoming
          : incoming
          ? [incoming]
          : [];
        incomingCounts[table] = incomingArray.length;
        totalIncomingCount += incomingArray.length;

        // Current DB records
        const currentRecords = await (this.database as any)[table].toArray();
        existingCounts[table] = currentRecords.length;
        existingRecordsByTable[table] = currentRecords;

        const idSet = new Set<string>();
        const fpSet = new Set<string>();
        for (const r of currentRecords) {
          if (r.id) idSet.add(r.id);
          const fp = computeEntityFingerprint(table, r);
          if (fp) fpSet.add(fp);
        }
        existingIdsByTable[table] = idSet;
        existingFingerprintsByTable[table] = fpSet;

        // Compare incoming vs existing
        for (const inc of incomingArray) {
          if (!inc) continue;
          const incId = inc.id;
          const incFp = computeEntityFingerprint(table, inc);

          const hasIdCollision = incId && idSet.has(incId);
          const hasFpDuplicate = incFp && fpSet.has(incFp);

          if (hasFpDuplicate) {
            duplicateCount += 1;
          }
          if (hasIdCollision) {
            idCollisionCount += 1;
          }

          // Conflict formulation
          if (table === 'settings') {
            if (options.preserveSettings !== false) {
              // Settings conflict: current settings exist vs incoming settings
              conflicts.push({
                id: `conflict-settings-${incId || 'current_settings'}`,
                category: 'settings_conflict',
                entityType: 'settings',
                sourceId: incId || 'current_settings',
                existingId: 'current_settings',
                title: 'Application Settings Conflict',
                description:
                  'Current workspace and theme settings exist. By default, existing settings are preserved.',
                availablePolicies: ['keep_existing', 'replace_existing'],
                defaultPolicy: 'keep_existing',
                selectedPolicy: 'keep_existing',
              });
            }
          } else if (hasIdCollision && !hasFpDuplicate) {
            // ID Collision: same ID but different content
            conflicts.push({
              id: `conflict-id-${table}-${incId}`,
              category: 'id_collision',
              entityType: table,
              sourceId: incId,
              existingId: incId,
              title: `ID Collision on ${table} (${inc.title || inc.name || incId})`,
              description: `Incoming item has ID "${incId}" which already exists with different content. A new unique ID will be assigned.`,
              availablePolicies: ['import_as_new', 'skip', 'replace_existing'],
              defaultPolicy: 'import_as_new',
              selectedPolicy: 'import_as_new',
            });
          } else if (hasFpDuplicate) {
            // Duplicate content
            conflicts.push({
              id: `conflict-dup-${table}-${incId || incFp}`,
              category: 'duplicate_content',
              entityType: table,
              sourceId: incId,
              title: `Duplicate ${table} (${inc.title || inc.name || inc.url || incId})`,
              description: `An identical item already exists in the database.`,
              availablePolicies: ['skip', 'import_as_new', 'replace_existing'],
              defaultPolicy: 'skip',
              selectedPolicy: 'skip',
            });
          }
        }
      }
    }

    // Generate deterministic planToken from existing entity counts & boundary modification state
    const planToken = await this.computePlanToken(existingCounts, options);

    return {
      backupMetadata: backup.metadata,
      selectedGroups,
      targetWorkspaceMode,
      targetWorkspaceId: options.targetWorkspaceId,
      targetWorkspaceName,
      incomingCounts,
      existingCounts,
      newEntitiesCount: Math.max(0, totalIncomingCount - duplicateCount),
      duplicateCount,
      idCollisionCount,
      conflicts,
      warnings: depResult.warnings,
      missingDependencies: depResult.missingDependencies,
      planToken,
    };
  }

  /**
   * Builds the deterministic execution plan from preview and user resolutions.
   */
  async buildMergePlan(
    preview: MergeImportPreview,
    backupInput: NookSpaceUniversalBackupV1 | string | object,
    options: MergeImportOptions
  ): Promise<MergeImportPlan> {
    const validation = await validateBackup(backupInput, {
      skipChecksumVerification: options.skipChecksumVerification,
    });
    if (!validation.isValid || !validation.canonicalBackup) {
      throw new Error('Invalid backup during plan generation');
    }

    const backupData = validation.canonicalBackup.data;
    const context = createRemappingContext();

    // Map resolutions from customConflictResolutions and preview conflicts
    const resolutionMap = new Map<string, MergeConflictPolicy>();
    for (const c of preview.conflicts) {
      const custom = options.customConflictResolutions?.[c.id];
      resolutionMap.set(c.id, custom || c.selectedPolicy || c.defaultPolicy);
    }

    const recordsToInsert: Record<string, unknown[]> = {};
    const recordsToUpdate: Record<string, unknown[]> = {};
    const skippedEntityIds: string[] = [];

    // 1. Determine Target Workspace
    let effectiveTargetWorkspaceId = options.targetWorkspaceId;

    if (options.createNewWorkspaceForImport) {
      effectiveTargetWorkspaceId = generateRemappedId('ws-imported');
      const newWs = {
        id: effectiveTargetWorkspaceId,
        name: options.newWorkspaceName || 'Imported Workspace',
        icon: 'Folder',
        color: '#6366f1',
        order: 99,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      recordsToInsert['workspaces'] = [newWs];
    }

    // 2. Pre-assign ID remappings for all incoming entities
    // To handle collisions and deep foreign keys, we inspect all tables in scope
    for (const group of options.selectedGroups) {
      const tables = DATA_GROUP_TABLE_MAP[group] || [];
      for (const table of tables) {
        recordsToInsert[table] = recordsToInsert[table] || [];
        recordsToUpdate[table] = recordsToUpdate[table] || [];

        const incoming = (backupData as any)[table] || [];
        const incomingArray = Array.isArray(incoming)
          ? incoming
          : incoming
          ? [incoming]
          : [];

        // Current IDs in DB
        const currentRecords = await (this.database as any)[table].toArray();
        const currentIds = new Set<string>(currentRecords.map((r: any) => r.id));

        for (const entity of incomingArray) {
          if (!entity) continue;
          const entityId = entity.id;

          // Check if this entity has a conflict
          const idConflict = preview.conflicts.find(
            (c) => c.entityType === table && c.sourceId === entityId
          );
          const policy = idConflict
            ? resolutionMap.get(idConflict.id) || idConflict.defaultPolicy
            : options.defaultConflictPolicy || 'import_as_new';

          if (policy === 'skip' || policy === 'keep_existing') {
            skippedEntityIds.push(entityId);
            continue;
          }

          if (table === 'settings') {
            if (policy === 'replace_existing') {
              recordsToUpdate['settings'].push(entity);
            } else {
              skippedEntityIds.push('current_settings');
            }
            continue;
          }

          // If table is workspaces and we are creating or targeting another workspace
          if (table === 'workspaces' && effectiveTargetWorkspaceId) {
            context.workspaceIdMap.set(entityId, effectiveTargetWorkspaceId);
            continue;
          }

          // ID collision check or import_as_new
          const hasCollision = currentIds.has(entityId);
          if (hasCollision || policy === 'import_as_new' || options.createNewWorkspaceForImport) {
            const prefix = this.getTablePrefix(table);
            const newTargetId = generateRemappedId(prefix);
            this.remappingSvc.registerIdMapping(context, table, entityId, newTargetId);
          } else {
            // Keep original ID
            this.remappingSvc.registerIdMapping(context, table, entityId, entityId);
          }
        }
      }
    }

    // 3. Process entities and apply deep foreign-key remapping
    for (const group of options.selectedGroups) {
      const tables = DATA_GROUP_TABLE_MAP[group] || [];
      for (const table of tables) {
        if (table === 'settings') continue; // already handled
        if (table === 'workspaces' && options.createNewWorkspaceForImport) continue;

        const incoming = (backupData as any)[table] || [];
        const incomingArray = Array.isArray(incoming)
          ? incoming
          : incoming
          ? [incoming]
          : [];

        for (const entity of incomingArray) {
          if (!entity) continue;
          const entityId = entity.id;

          if (skippedEntityIds.includes(entityId)) {
            continue;
          }

          const idConflict = preview.conflicts.find(
            (c) => c.entityType === table && c.sourceId === entityId
          );
          const policy = idConflict
            ? resolutionMap.get(idConflict.id) || idConflict.defaultPolicy
            : options.defaultConflictPolicy || 'import_as_new';

          // Remap foreign keys and primary keys
          const remapped = this.remappingSvc.remapEntity(
            table,
            entity,
            context,
            effectiveTargetWorkspaceId
          );

          if (policy === 'replace_existing') {
            recordsToUpdate[table].push(remapped);
          } else {
            recordsToInsert[table].push(remapped);
          }
        }
      }
    }

    // Export serializable ID mappings
    const idMappings: Record<string, Record<string, string>> = {
      workspaces: Object.fromEntries(context.workspaceIdMap),
      widgetInstances: Object.fromEntries(context.instanceIdMap),
      notes: Object.fromEntries(context.noteIdMap),
      noteCollections: Object.fromEntries(context.collectionIdMap),
      bookmarks: Object.fromEntries(context.bookmarkIdMap),
      bookmarkGroups: Object.fromEntries(context.groupIdMap),
      todos: Object.fromEntries(context.todoIdMap),
    };

    let toInsertCount = 0;
    for (const arr of Object.values(recordsToInsert)) {
      toInsertCount += arr.length;
    }
    let toUpdateCount = 0;
    for (const arr of Object.values(recordsToUpdate)) {
      toUpdateCount += arr.length;
    }

    return {
      planId: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      planToken: preview.planToken,
      createdAt: Date.now(),
      selectedGroups: options.selectedGroups,
      targetWorkspaceId: effectiveTargetWorkspaceId,
      recordsToInsert,
      recordsToUpdate,
      skippedEntityIds,
      idMappings,
      summary: {
        toInsertCount,
        toUpdateCount,
        skippedCount: skippedEntityIds.length,
        conflictsResolvedCount: preview.conflicts.length,
      },
    };
  }

  /**
   * Validates whether a plan is still fresh and safe to execute against the current DB state.
   */
  async validatePlanFreshness(
    plan: MergeImportPlan,
    options: MergeImportOptions
  ): Promise<{ isFresh: boolean; reason?: string }> {
    const currentCounts: Record<string, number> = {};
    for (const group of plan.selectedGroups) {
      const tables = DATA_GROUP_TABLE_MAP[group] || [];
      for (const t of tables) {
        currentCounts[t] = await (this.database as any)[t].count();
      }
    }

    const currentToken = await this.computePlanToken(currentCounts, options);
    if (currentToken !== plan.planToken) {
      return {
        isFresh: false,
        reason:
          'Database state has been modified since preview was generated. Please refresh the merge preview.',
      };
    }

    return { isFresh: true };
  }

  private async computePlanToken(
    counts: Record<string, number>,
    options: MergeImportOptions
  ): Promise<string> {
    const sortedKeys = Object.keys(counts).sort();
    const parts: string[] = [];
    for (const k of sortedKeys) {
      const count = counts[k] || 0;
      let boundary = '';
      if (count > 0) {
        try {
          const tbl = (this.database as any)[k];
          if (tbl) {
            const first = await tbl.toCollection().first();
            const last = await tbl.toCollection().last();
            boundary = `:${first?.id || ''}:${first?.updatedAt || first?.createdAt || ''}|${last?.id || ''}:${last?.updatedAt || last?.createdAt || ''}`;
          }
        } catch {
          // ignore in headless mocks without collections
        }
      }
      parts.push(`${k}:${count}${boundary}`);
    }
    const countStr = parts.join(';');
    const groupsStr = [...options.selectedGroups].sort().join(',');
    const targetWs = options.targetWorkspaceId || 'none';
    return `token_${countStr}__${groupsStr}__${targetWs}`;
  }

  private getTablePrefix(table: string): string {
    switch (table) {
      case 'workspaces':
        return 'ws';
      case 'widgetInstances':
        return 'wi';
      case 'notes':
        return 'nt';
      case 'noteCollections':
        return 'nc';
      case 'noteTags':
        return 'ntag';
      case 'noteBookmarkLinks':
        return 'nbl';
      case 'bookmarks':
        return 'bm';
      case 'bookmarkGroups':
        return 'bg';
      case 'todos':
        return 'td';
      case 'focusSessions':
        return 'fs';
      case 'dailyGoals':
        return 'dg';
      case 'stickyNotes':
        return 'sn';
      case 'vocabulary':
        return 'voc';
      case 'resources':
        return 'res';
      case 'calendarEvents':
        return 'ev';
      default:
        return 'item';
    }
  }
}
