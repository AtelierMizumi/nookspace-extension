import { MigrationRegistry } from '../registry/migrationRegistry';
import {
  v1ToV2LayoutsMigration,
  v2ToV3BookmarksMigration,
  v3ToV4NotesMigration,
} from './schemaMigrations';
import {
  legacyTodosEntityMigration,
  legacyQuickNotesEntityMigration,
} from './entityMigrations';
import { repairDanglingRelationshipsMigration } from './relationshipMigrations';
import { normalizeWorkspaceMetadataMigration } from './normalizationMigrations';

/**
 * Registers all core NookSpace migrations into the provided registry.
 */
export function registerDefaultMigrations(registry: MigrationRegistry): void {
  // Schema migrations (v1 -> v2 -> v3 -> v4)
  registry.register(v1ToV2LayoutsMigration);
  registry.register(v2ToV3BookmarksMigration);
  registry.register(v3ToV4NotesMigration);

  // Entity migrations
  registry.register(legacyTodosEntityMigration);
  registry.register(legacyQuickNotesEntityMigration);

  // Relationship migrations
  registry.register(repairDanglingRelationshipsMigration);

  // Normalization migrations
  registry.register(normalizeWorkspaceMetadataMigration);
}
