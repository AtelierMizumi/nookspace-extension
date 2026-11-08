import { MigrationDefinition, MigrationType } from '../types/migrationTypes';

export class MigrationRegistry {
  private migrations: Map<string, MigrationDefinition> = new Map();

  /**
   * Registers a new migration definition.
   * Throws if an identical ID has already been registered.
   */
  register(migration: MigrationDefinition): void {
    if (!migration.id || migration.id.trim() === '') {
      throw new Error('Migration ID must be a non-empty string');
    }
    if (this.migrations.has(migration.id)) {
      throw new Error(`Duplicate migration ID registered: "${migration.id}"`);
    }
    this.migrations.set(migration.id, {
      ...migration,
      dependencies: migration.dependencies ? [...migration.dependencies] : [],
    });
  }

  /**
   * Registers an array of migration definitions.
   */
  registerAll(migrations: MigrationDefinition[]): void {
    for (const m of migrations) {
      this.register(m);
    }
  }

  /**
   * Retrieves a migration definition by its unique ID.
   */
  get(id: string): MigrationDefinition | undefined {
    return this.migrations.get(id);
  }

  /**
   * Retrieves all registered migrations in arbitrary order.
   */
  getAll(): MigrationDefinition[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Retrieves migrations filtered by type.
   */
  getByType(type: MigrationType): MigrationDefinition[] {
    return this.getAll().filter((m) => m.type === type);
  }

  /**
   * Clears all registered migrations (primarily for isolated unit tests).
   */
  clear(): void {
    this.migrations.clear();
  }

  /**
   * Returns total count of registered migrations.
   */
  get count(): number {
    return this.migrations.size;
  }

  /**
   * Resolves a topologically sorted execution plan respecting dependency ordering.
   * Throws an Error if a dependency is missing or if a cycle is detected.
   */
  getExecutionPlan(): MigrationDefinition[] {
    const all = this.getAll();
    const inDegree: Map<string, number> = new Map();
    const adj: Map<string, string[]> = new Map(); // dep -> dependents

    // Initialize graph structures
    for (const m of all) {
      inDegree.set(m.id, 0);
      adj.set(m.id, []);
    }

    // Build edges: if migration M depends on D, D must execute before M.
    // Edge in dependency graph: D -> M
    for (const m of all) {
      if (m.dependencies && m.dependencies.length > 0) {
        for (const depId of m.dependencies) {
          if (!this.migrations.has(depId)) {
            throw new Error(
              `Migration "${m.id}" has missing dependency "${depId}". It must be registered first.`
            );
          }
          adj.get(depId)!.push(m.id);
          inDegree.set(m.id, (inDegree.get(m.id) || 0) + 1);
        }
      }
    }

    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const sortedOrder: MigrationDefinition[] = [];

    while (queue.length > 0) {
      // Deterministic tie-breaking: prefer earlier version or alphabetical
      queue.sort((a, b) => {
        const ma = this.migrations.get(a)!;
        const mb = this.migrations.get(b)!;
        if (ma.version !== undefined && mb.version !== undefined && ma.version !== mb.version) {
          return ma.version - mb.version;
        }
        return a.localeCompare(b);
      });

      const currentId = queue.shift()!;
      sortedOrder.push(this.migrations.get(currentId)!);

      for (const dependentId of adj.get(currentId) || []) {
        const newDeg = (inDegree.get(dependentId) || 0) - 1;
        inDegree.set(dependentId, newDeg);
        if (newDeg === 0) {
          queue.push(dependentId);
        }
      }
    }

    // Cycle detection: if sorted length does not match total registered, cycle exists
    if (sortedOrder.length !== all.length) {
      const remainingNodes = Array.from(inDegree.entries())
        .filter(([_, deg]) => deg > 0)
        .map(([id]) => id);

      throw new Error(
        `Cyclic dependency detected in migrations: [${remainingNodes.join(', ')}]`
      );
    }

    return sortedOrder;
  }
}

export const migrationRegistry = new MigrationRegistry();
