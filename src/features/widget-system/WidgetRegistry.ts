import { WidgetDefinition, WidgetCategory } from './types';

export class WidgetRegistry {
  private static instance: WidgetRegistry;
  private widgets: Map<string, WidgetDefinition<any>> = new Map();

  private constructor() {}

  public static getInstance(): WidgetRegistry {
    if (!WidgetRegistry.instance) {
      WidgetRegistry.instance = new WidgetRegistry();
    }
    return WidgetRegistry.instance;
  }

  public register<TConfig = Record<string, unknown>>(definition: WidgetDefinition<TConfig>): void {
    if (this.widgets.has(definition.type)) {
      console.warn(`[WidgetRegistry] Overwriting already registered widget type "${definition.type}"`);
    }
    this.widgets.set(definition.type, definition);
  }

  public get<TConfig = Record<string, unknown>>(type: string): WidgetDefinition<TConfig> | undefined {
    return this.widgets.get(type);
  }

  public getAll(): WidgetDefinition<any>[] {
    return Array.from(this.widgets.values());
  }

  public getByCategory(category: WidgetCategory): WidgetDefinition<any>[] {
    return this.getAll().filter((w) => w.category === category);
  }

  public has(type: string): boolean {
    return this.widgets.has(type);
  }

  public clear(): void {
    this.widgets.clear();
  }
}

export const widgetRegistry = WidgetRegistry.getInstance();
