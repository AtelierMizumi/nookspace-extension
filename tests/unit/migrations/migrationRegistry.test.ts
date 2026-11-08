import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationRegistry } from '../../../src/features/migrations/registry/migrationRegistry';
import { MigrationDefinition } from '../../../src/features/migrations/types/migrationTypes';

describe('MigrationRegistry Suite — Milestone 9.5', () => {
  let registry: MigrationRegistry;

  beforeEach(() => {
    registry = new MigrationRegistry();
  });

  const createDummyMigration = (
    id: string,
    dependencies: string[] = [],
    version?: number
  ): MigrationDefinition => ({
    id,
    name: `Test Migration ${id}`,
    description: `Description for ${id}`,
    type: 'entity',
    version,
    dependencies,
    execute: async () => ({
      success: true,
      recordsProcessed: 1,
      recordsModified: 1,
    }),
  });

  it('1. registers unique migration definitions and retrieves them', () => {
    const m1 = createDummyMigration('mig-1');
    registry.register(m1);

    expect(registry.count).toBe(1);
    expect(registry.get('mig-1')?.id).toBe('mig-1');
    expect(registry.getAll()).toHaveLength(1);
  });

  it('2. throws an error on duplicate migration ID', () => {
    registry.register(createDummyMigration('duplicate-id'));

    expect(() => {
      registry.register(createDummyMigration('duplicate-id'));
    }).toThrowError(/Duplicate migration ID registered: "duplicate-id"/);
  });

  it('3. rejects empty or blank migration ID', () => {
    expect(() => {
      registry.register(createDummyMigration(''));
    }).toThrowError(/Migration ID must be a non-empty string/);

    expect(() => {
      registry.register(createDummyMigration('   '));
    }).toThrowError(/Migration ID must be a non-empty string/);
  });

  it('4. filters migrations by type', () => {
    registry.register({
      ...createDummyMigration('schema-1'),
      type: 'schema',
    });
    registry.register({
      ...createDummyMigration('entity-1'),
      type: 'entity',
    });
    registry.register({
      ...createDummyMigration('rel-1'),
      type: 'relationship',
    });

    expect(registry.getByType('schema')).toHaveLength(1);
    expect(registry.getByType('entity')).toHaveLength(1);
    expect(registry.getByType('relationship')).toHaveLength(1);
    expect(registry.getByType('normalization')).toHaveLength(0);
  });

  it('5. resolves execution plan with topological dependency ordering', () => {
    // C depends on B, B depends on A
    registry.register(createDummyMigration('mig-c', ['mig-b']));
    registry.register(createDummyMigration('mig-a', []));
    registry.register(createDummyMigration('mig-b', ['mig-a']));

    const plan = registry.getExecutionPlan();
    const planIds = plan.map((p) => p.id);

    expect(planIds).toEqual(['mig-a', 'mig-b', 'mig-c']);
  });

  it('6. detects and rejects missing dependencies with descriptive error', () => {
    registry.register(createDummyMigration('mig-leaf', ['non-existent-parent']));

    expect(() => {
      registry.getExecutionPlan();
    }).toThrowError(/Migration "mig-leaf" has missing dependency "non-existent-parent"/);
  });

  it('7. detects cyclic dependencies and throws error with cycle information', () => {
    // Cycle: X -> Y -> Z -> X
    registry.register(createDummyMigration('mig-x', ['mig-z']));
    registry.register(createDummyMigration('mig-y', ['mig-x']));
    registry.register(createDummyMigration('mig-z', ['mig-y']));

    expect(() => {
      registry.getExecutionPlan();
    }).toThrowError(/Cyclic dependency detected in migrations/);
  });

  it('8. clears all registered migrations', () => {
    registry.register(createDummyMigration('mig-temp'));
    expect(registry.count).toBe(1);

    registry.clear();
    expect(registry.count).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});
