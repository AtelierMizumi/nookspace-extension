import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { NookSpaceDB } from '../../../src/services/database/db';
import { WorkspaceRepository } from '../../../src/services/database/repositories/workspaceRepository';
import { createWorkspaceStore } from '../../../src/stores/workspaceStore';
import { createLayoutStore } from '../../../src/stores/layoutStore';
import { createWidgetStore } from '../../../src/stores/widgetStore';
import { useCustomizationStore } from '../../../src/stores/customizationStore';
import {
  WorkspaceSyncService,
  STORAGE_KEY_ACTIVE_WORKSPACE_ID,
} from '../../../src/features/workspaces/services/workspaceSyncService';

describe('Milestone 8.6 — WorkspaceSyncService Unit Suite', () => {
  let testDb: NookSpaceDB;
  let workspaceRepo: WorkspaceRepository;
  let workspaceStore: ReturnType<typeof createWorkspaceStore>;
  let layoutStore: ReturnType<typeof createLayoutStore>;
  let widgetStore: ReturnType<typeof createWidgetStore>;
  let syncService: WorkspaceSyncService;

  const ws1 = 'ws-sync-1';
  const ws2 = 'ws-sync-2';

  beforeEach(async () => {
    testDb = new NookSpaceDB(`test-ws-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    await testDb.open();
    workspaceRepo = new WorkspaceRepository(testDb);

    // Create 2 test workspaces
    await testDb.workspaces.bulkPut([
      {
        id: ws1,
        name: 'Workspace One',
        icon: 'LayoutGrid',
        isDefault: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: ws2,
        name: 'Workspace Two',
        icon: 'Briefcase',
        isDefault: false,
        order: 1,
        createdAt: 2000,
        updatedAt: 2000,
      },
    ]);

    workspaceStore = createWorkspaceStore({ repo: workspaceRepo, database: testDb });
    await workspaceStore.getState().initWorkspaces();
    workspaceStore.setState({ activeWorkspaceId: ws1 });

    layoutStore = createLayoutStore();
    widgetStore = createWidgetStore();

    syncService = new WorkspaceSyncService({
      repo: workspaceRepo,
      workspaceStore: workspaceStore as any,
      layoutStore: layoutStore as any,
      widgetStore: widgetStore as any,
      customizationStore: useCustomizationStore as any,
    });
  });

  afterEach(async () => {
    await testDb.delete();
    vi.restoreAllMocks();
  });

  it('1. ignores invalid, empty, or identical workspace IDs', async () => {
    // Null, undefined, empty string, non-string
    expect(await syncService.handleWorkspaceChange(null)).toBeNull();
    expect(await syncService.handleWorkspaceChange(undefined)).toBeNull();
    expect(await syncService.handleWorkspaceChange('')).toBeNull();
    expect(await syncService.handleWorkspaceChange('   ')).toBeNull();
    expect(await syncService.handleWorkspaceChange(12345)).toBeNull();

    // Identical to current active workspace
    expect(await syncService.handleWorkspaceChange(ws1)).toBeNull();
    expect(workspaceStore.getState().activeWorkspaceId).toBe(ws1);
  });

  it('2. successfully synchronizes to a valid new workspace', async () => {
    const result = await syncService.handleWorkspaceChange(ws2);
    expect(result).toBe(ws2);
    expect(workspaceStore.getState().activeWorkspaceId).toBe(ws2);
  });

  it('3. falls back to default workspace when incoming workspace does not exist in DB', async () => {
    const nonExistentId = 'ws-non-existent-999';
    // Current is ws2
    workspaceStore.setState({ activeWorkspaceId: ws2 });

    const result = await syncService.handleWorkspaceChange(nonExistentId);
    // ws1 is the default workspace
    expect(result).toBe(ws1);
    expect(workspaceStore.getState().activeWorkspaceId).toBe(ws1);
  });

  it('4. clears pending debounced layout saves when switching workspace', async () => {
    const clearSpy = vi.spyOn(layoutStore.getState(), 'clearPendingDebounce');

    await syncService.handleWorkspaceChange(ws2);
    expect(clearSpy).toHaveBeenCalled();
  });

  it('5. safely discards unsaved Customization Studio drafts when external sync occurs', async () => {
    // Put Customization Studio into edit mode with unsaved changes
    useCustomizationStore.setState({
      isEditMode: true,
      hasUnsavedChanges: true,
      activeWorkspaceId: ws1,
      originalLayoutsSnapshot: {
        lg: [
          {
            id: 'l1',
            workspaceId: ws1,
            widgetInstanceId: 'w1',
            breakpoint: 'lg',
            x: 0,
            y: 0,
            w: 2,
            h: 2,
            isDefault: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      },
      stagedDeletedWidgetIds: ['w1'],
    });

    const discardSpy = vi.spyOn(useCustomizationStore.getState(), 'forceDiscardAndSwitchWorkspace');

    await syncService.handleWorkspaceChange(ws2);

    expect(discardSpy).toHaveBeenCalledWith(ws2);
    expect(useCustomizationStore.getState().isEditMode).toBe(false);
    expect(useCustomizationStore.getState().hasUnsavedChanges).toBe(false);
    expect(useCustomizationStore.getState().originalLayoutsSnapshot).toBeNull();
  });

  it('6. startSync registers and unregisters listeners cleanly', async () => {
    let storageListener: ((changes: any, area: string) => void) | null = null;
    (globalThis as any).browser = {
      storage: {
        onChanged: {
          addListener: vi.fn((cb) => {
            storageListener = cb;
          }),
          removeListener: vi.fn(() => {
            storageListener = null;
          }),
        },
      },
    };

    const cleanup = syncService.startSync();
    expect((globalThis as any).browser.storage.onChanged.addListener).toHaveBeenCalled();

    // Trigger storage event
    expect(storageListener).toBeDefined();
    await storageListener!({ [STORAGE_KEY_ACTIVE_WORKSPACE_ID]: { newValue: ws2 } }, 'local');

    await waitFor(() => {
      expect(workspaceStore.getState().activeWorkspaceId).toBe(ws2);
    });

    // Cleanup
    cleanup();
    expect((globalThis as any).browser.storage.onChanged.removeListener).toHaveBeenCalled();
    delete (globalThis as any).browser;
  });

  it('7. window storage event triggers workspace switch', async () => {
    const cleanup = syncService.startSync();

    const storageEvent = new StorageEvent('storage', {
      key: STORAGE_KEY_ACTIVE_WORKSPACE_ID,
      newValue: JSON.stringify(ws2),
    });

    window.dispatchEvent(storageEvent);

    await waitFor(() => {
      expect(workspaceStore.getState().activeWorkspaceId).toBe(ws2);
    });

    cleanup();
  });
});
