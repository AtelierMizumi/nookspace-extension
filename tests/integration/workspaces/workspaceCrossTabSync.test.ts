import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { WidgetInstanceRepository } from '../../../src/services/database/repositories/widgetInstanceRepository';
import { LayoutRepository } from '../../../src/services/database/repositories/layoutRepository';
import { createWorkspaceStore } from '../../../src/stores/workspaceStore';
import { createWidgetStore } from '../../../src/stores/widgetStore';
import { createLayoutStore } from '../../../src/stores/layoutStore';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import {
  WorkspaceSyncService,
  STORAGE_KEY_ACTIVE_WORKSPACE_ID,
} from '../../../src/features/workspaces/services/workspaceSyncService';
import { BrowserApi } from '../../../src/services/browser/types';

describe('Milestone 8.6 — Multi-Tab Workspace Cross-Tab Synchronization Suite', () => {
  let testDb: NookSpaceDB;
  let workspaceRepo: WorkspaceRepository;
  let widgetInstanceRepo: WidgetInstanceRepository;
  let layoutRepo: LayoutRepository;

  // Shared mock storage
  const mockStorage = new Map<string, any>();
  const storageListeners = new Set<(changes: Record<string, any>, area: string) => void>();

  const createMockBrowser = (): BrowserApi =>
    ({
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const res: Record<string, any> = {};
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) {
              if (mockStorage.has(k)) res[k] = mockStorage.get(k);
            }
            return res;
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            const changes: Record<string, any> = {};
            for (const [k, v] of Object.entries(items)) {
              const oldValue = mockStorage.get(k);
              mockStorage.set(k, v);
              changes[k] = { oldValue, newValue: v };
            }
            // Broadcast to all listeners
            for (const listener of storageListeners) {
              listener(changes, 'local');
            }
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) mockStorage.delete(k);
          }),
        },
      },
    } as unknown as BrowserApi);

  const wsA = 'ws-tab-alpha';
  const wsB = 'ws-tab-beta';

  beforeEach(async () => {
    mockStorage.clear();
    storageListeners.clear();

    testDb = new NookSpaceDB(`test-crosstab-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    workspaceRepo = new WorkspaceRepository(testDb);
    widgetInstanceRepo = new WidgetInstanceRepository(testDb);
    layoutRepo = new LayoutRepository(testDb);

    // Seed 2 workspaces
    await testDb.workspaces.bulkPut([
      {
        id: wsA,
        name: 'Alpha Workspace',
        icon: 'LayoutGrid',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: wsB,
        name: 'Beta Workspace',
        icon: 'Code',
        isDefault: false,
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
      },
    ]);

    // Seed widgets & layouts in wsA
    const wInstA = await widgetInstanceRepo.create({
      workspaceId: wsA,
      widgetType: 'clock',
      title: 'Clock A',
    });
    await layoutRepo.saveLayouts(wsA, 'lg', [
      {
        id: `${wsA}_${wInstA.id}_lg`,
        workspaceId: wsA,
        widgetInstanceId: wInstA.id,
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
      },
    ]);

    // Seed widgets & layouts in wsB
    const wInstB = await widgetInstanceRepo.create({
      workspaceId: wsB,
      widgetType: 'pomodoro',
      title: 'Pomodoro B',
    });
    await layoutRepo.saveLayouts(wsB, 'lg', [
      {
        id: `${wsB}_${wInstB.id}_lg`,
        workspaceId: wsB,
        widgetInstanceId: wInstB.id,
        breakpoint: 'lg',
        x: 2,
        y: 2,
        w: 6,
        h: 4,
      },
    ]);

    // Wire global browser mock for startSync
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: (cb: any) => storageListeners.add(cb),
          removeListener: (cb: any) => storageListeners.delete(cb),
        },
      },
    };
  });

  afterEach(async () => {
    delete (globalThis as any).browser;
    await testDb.delete();
  });

  it('1. Tab 1 switches workspace: Tab 2 automatically detects change and synchronizes widgets and layout without reload', async () => {
    const mockBrowser = createMockBrowser();

    // Tab 1 setup
    const tab1WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    await tab1WorkspaceStore.getState().initWorkspaces();
    expect(tab1WorkspaceStore.getState().activeWorkspaceId).toBe(wsA);

    // Tab 2 setup
    const tab2WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WidgetStore = createWidgetStore({ repo: widgetInstanceRepo });
    const tab2LayoutStore = createLayoutStore({ layoutRepo, widgetInstanceRepo });

    await tab2WorkspaceStore.getState().initWorkspaces();
    await tab2WidgetStore.getState().loadWidgets(wsA);
    await tab2LayoutStore.getState().loadLayouts(wsA, 'lg');

    // Tab 2 starts sync listener
    const tab2SyncService = new WorkspaceSyncService({
      repo: workspaceRepo,
      workspaceStore: tab2WorkspaceStore as any,
      widgetStore: tab2WidgetStore as any,
      layoutStore: tab2LayoutStore as any,
      customizationStore: useCustomizationStore as any,
    });
    const cleanupTab2 = tab2SyncService.startSync();

    // Verify Tab 2 initial state (wsA)
    expect(tab2WorkspaceStore.getState().activeWorkspaceId).toBe(wsA);
    expect(tab2WidgetStore.getState().instances).toHaveLength(1);
    expect(tab2WidgetStore.getState().instances[0].widgetType).toBe('clock');
    expect(tab2LayoutStore.getState().layouts).toHaveLength(1);
    expect(tab2LayoutStore.getState().layouts[0].workspaceId).toBe(wsA);

    // Tab 1 switches to wsB
    await tab1WorkspaceStore.getState().setActiveWorkspace(wsB);

    // Verify Tab 2 automatically updated without page reload
    await waitFor(() => {
      expect(tab2WorkspaceStore.getState().activeWorkspaceId).toBe(wsB);
    });

    expect(tab2WidgetStore.getState().instances).toHaveLength(1);
    expect(tab2WidgetStore.getState().instances[0].widgetType).toBe('pomodoro');
    expect(tab2LayoutStore.getState().layouts).toHaveLength(1);
    expect(tab2LayoutStore.getState().layouts[0].workspaceId).toBe(wsB);

    cleanupTab2();
  });

  it('2. Tab 1 creates a workspace: Tab 2 updates active workspace and synchronizes workspace list', async () => {
    const mockBrowser = createMockBrowser();

    const tab1WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WidgetStore = createWidgetStore({ repo: widgetInstanceRepo });
    const tab2LayoutStore = createLayoutStore({ layoutRepo, widgetInstanceRepo });

    await tab1WorkspaceStore.getState().initWorkspaces();
    await tab2WorkspaceStore.getState().initWorkspaces();

    const tab2SyncService = new WorkspaceSyncService({
      repo: workspaceRepo,
      workspaceStore: tab2WorkspaceStore as any,
      widgetStore: tab2WidgetStore as any,
      layoutStore: tab2LayoutStore as any,
      customizationStore: useCustomizationStore as any,
    });
    const cleanupTab2 = tab2SyncService.startSync();

    // Tab 1 creates workspace Gamma
    const createdGamma = await tab1WorkspaceStore.getState().createWorkspace('Gamma Workspace');

    await waitFor(() => {
      expect(tab2WorkspaceStore.getState().activeWorkspaceId).toBe(createdGamma.id);
    });

    // Tab 2 workspace list now contains Gamma
    expect(tab2WorkspaceStore.getState().workspaces.some((w) => w.id === createdGamma.id)).toBe(true);

    cleanupTab2();
  });

  it('3. Tab 1 deletes the active workspace: Tab 2 seamlessly transitions to default fallback workspace', async () => {
    const mockBrowser = createMockBrowser();

    const tab1WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WidgetStore = createWidgetStore({ repo: widgetInstanceRepo });
    const tab2LayoutStore = createLayoutStore({ layoutRepo, widgetInstanceRepo });

    await tab1WorkspaceStore.getState().initWorkspaces();
    await tab2WorkspaceStore.getState().initWorkspaces();

    // Both tabs start on wsB
    await tab1WorkspaceStore.getState().setActiveWorkspace(wsB);
    tab2WorkspaceStore.setState({ activeWorkspaceId: wsB });

    const tab2SyncService = new WorkspaceSyncService({
      repo: workspaceRepo,
      workspaceStore: tab2WorkspaceStore as any,
      widgetStore: tab2WidgetStore as any,
      layoutStore: tab2LayoutStore as any,
      customizationStore: useCustomizationStore as any,
    });
    const cleanupTab2 = tab2SyncService.startSync();

    // Tab 1 deletes wsB
    await tab1WorkspaceStore.getState().deleteWorkspace(wsB);

    // Tab 2 transitions to default workspace wsA
    await waitFor(() => {
      expect(tab2WorkspaceStore.getState().activeWorkspaceId).toBe(wsA);
    });

    expect(tab2WorkspaceStore.getState().workspaces.some((w) => w.id === wsB)).toBe(false);

    cleanupTab2();
  });

  it('4. cancels pending debounced layout saves from previous workspace when external sync arrives', async () => {
    const mockBrowser = createMockBrowser();

    const tab2WorkspaceStore = createWorkspaceStore({
      repo: workspaceRepo,
      database: testDb,
      browser: mockBrowser,
    });
    const tab2WidgetStore = createWidgetStore({ repo: widgetInstanceRepo });
    const tab2LayoutStore = createLayoutStore({ layoutRepo, widgetInstanceRepo });

    await tab2WorkspaceStore.getState().initWorkspaces();
    await tab2LayoutStore.getState().loadLayouts(wsA, 'lg');

    const tab2SyncService = new WorkspaceSyncService({
      repo: workspaceRepo,
      workspaceStore: tab2WorkspaceStore as any,
      widgetStore: tab2WidgetStore as any,
      layoutStore: tab2LayoutStore as any,
      customizationStore: useCustomizationStore as any,
    });
    const cleanupTab2 = tab2SyncService.startSync();

    // User in Tab 2 starts a drag in wsA that triggers debounced save
    tab2LayoutStore.getState().debouncedSaveLayouts(wsA, 'lg');

    // External storage event arrives switching to wsB before 400ms debounce completes
    await mockBrowser.storage.local.set({ [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: wsB });

    await waitFor(() => {
      expect(tab2WorkspaceStore.getState().activeWorkspaceId).toBe(wsB);
    });

    // Wait 500ms to ensure debounce would have fired if not cancelled
    await new Promise((r) => setTimeout(r, 450));

    // Layouts in wsB must be isolated and not overwritten by wsA
    const wsBLayouts = await layoutRepo.getLayoutsByWorkspace(wsB, 'lg');
    expect(wsBLayouts).toHaveLength(1);
    expect(wsBLayouts[0].workspaceId).toBe(wsB);

    cleanupTab2();
  });
});
