import { useEffect } from 'react';
import {
  workspaceRepo,
  WorkspaceRepository,
} from '../../../services/database/repositories/workspaceRepository';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useWidgetStore } from '../../../stores/widgetStore';
import { useLayoutStore } from '../../../stores/layoutStore';
import { useCustomizationStore } from '../../../stores/customizationStore';
import { STORAGE_KEY_ACTIVE_WORKSPACE_ID } from '../../../types/workspaces';

export { STORAGE_KEY_ACTIVE_WORKSPACE_ID };

export interface WorkspaceSyncServiceDependencies {
  repo?: WorkspaceRepository;
  workspaceStore?: typeof useWorkspaceStore;
  widgetStore?: typeof useWidgetStore;
  layoutStore?: typeof useLayoutStore;
  customizationStore?: typeof useCustomizationStore;
}

export class WorkspaceSyncService {
  private repo: WorkspaceRepository;
  private workspaceStore: typeof useWorkspaceStore;
  private widgetStore: typeof useWidgetStore;
  private layoutStore: typeof useLayoutStore;
  private customizationStore: typeof useCustomizationStore;
  private isSyncing = false;

  constructor(deps: WorkspaceSyncServiceDependencies = {}) {
    this.repo = deps.repo ?? workspaceRepo;
    this.workspaceStore = deps.workspaceStore ?? useWorkspaceStore;
    this.widgetStore = deps.widgetStore ?? useWidgetStore;
    this.layoutStore = deps.layoutStore ?? useLayoutStore;
    this.customizationStore = deps.customizationStore ?? useCustomizationStore;
  }

  /**
   * Processes an incoming workspace change signal.
   * Validates target workspace ID, checks existence, resolves fallback if deleted,
   * handles Customization Studio drafts safely, clears debounces, and syncs dependent stores.
   */
  public async handleWorkspaceChange(newWorkspaceId: unknown): Promise<string | null> {
    if (typeof newWorkspaceId !== 'string' || !newWorkspaceId.trim()) {
      return null;
    }

    const trimmedId = newWorkspaceId.trim();
    const currentActiveId = this.workspaceStore.getState().activeWorkspaceId;

    if (trimmedId === currentActiveId) {
      return null;
    }

    if (this.isSyncing) {
      return null;
    }

    this.isSyncing = true;
    try {
      // 1. Validate that workspace exists in database
      const existing = await this.repo.getById(trimmedId);
      let targetId = trimmedId;

      if (!existing) {
        // Workspace may have been deleted in another tab; resolve default fallback
        const all = await this.repo.getAll();
        const fallback = all.find((w) => w.isDefault)?.id || all[0]?.id || 'ws-default-personal';
        targetId = fallback;
      }

      if (targetId === currentActiveId) {
        return null;
      }

      // 2. Customization Studio Guard
      const custState = this.customizationStore.getState();
      if (custState.isEditMode && custState.hasUnsavedChanges) {
        custState.forceDiscardAndSwitchWorkspace(targetId);
      } else {
        custState.requestWorkspaceSwitch(targetId);
      }

      // 3. Clear any pending debounced layout saves from prior workspace
      this.layoutStore.getState().clearPendingDebounce();

      // 4. Update workspace store without re-emitting storage event
      const updatedList = await this.repo.getAll();
      this.workspaceStore.setState({ workspaces: updatedList });
      this.workspaceStore.getState().syncExternalActiveWorkspace(targetId);

      // 5. Synchronize dependent widget & layout stores
      await this.widgetStore.getState().loadWidgets(targetId);
      const currentBreakpoint = this.layoutStore.getState().currentBreakpoint || 'lg';
      await this.layoutStore.getState().loadLayouts(targetId, currentBreakpoint);

      return targetId;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Starts listening to browser extension storage changes and window storage events.
   * Returns an unsubscribe cleanup function.
   */
  public startSync(): () => void {
    const handleStorageChange = (changes: Record<string, any>, areaName?: string) => {
      if (areaName && areaName !== 'local') return;
      if (changes[STORAGE_KEY_ACTIVE_WORKSPACE_ID]) {
        const change = changes[STORAGE_KEY_ACTIVE_WORKSPACE_ID];
        const newId =
          typeof change === 'object' && change !== null && 'newValue' in change
            ? change.newValue
            : change;
        return this.handleWorkspaceChange(newId);
      }
    };

    const handleWindowStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_ACTIVE_WORKSPACE_ID ||
        e.key === `nookspace:${STORAGE_KEY_ACTIVE_WORKSPACE_ID}`
      ) {
        if (!e.newValue) return;
        try {
          const parsed = JSON.parse(e.newValue);
          return this.handleWorkspaceChange(parsed);
        } catch {
          return this.handleWorkspaceChange(e.newValue);
        }
      }
    };

    let extListener: any = null;
    if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
      extListener = handleStorageChange;
      browser.storage.onChanged.addListener(extListener);
    } else if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      extListener = handleStorageChange;
      chrome.storage.onChanged.addListener(extListener);
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', handleWindowStorage);
    }

    return () => {
      if (extListener) {
        if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
          browser.storage.onChanged.removeListener(extListener);
        } else if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
          chrome.storage.onChanged.removeListener(extListener);
        }
      }
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', handleWindowStorage);
      }
    };
  }
}

export const workspaceSyncService = new WorkspaceSyncService();

/**
 * React hook that mounts cross-tab workspace synchronization for the active page.
 */
export function useWorkspaceSync() {
  useEffect(() => {
    const cleanup = workspaceSyncService.startSync();
    return () => {
      cleanup();
    };
  }, []);
}
