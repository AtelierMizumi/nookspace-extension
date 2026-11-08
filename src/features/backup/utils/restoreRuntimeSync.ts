import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useWidgetStore } from '../../../stores/widgetStore';
import { useLayoutStore } from '../../../stores/layoutStore';
import { useCustomizationStore } from '../../../stores/customizationStore';

export async function syncRuntimeStoresAfterRestore(): Promise<void> {
  try {
    // 1. Reset any active edit mode in customization store
    const customization = useCustomizationStore.getState();
    if (customization.isEditMode) {
      customization.cancelEditMode();
    }

    // 2. Re-initialize workspaces from database
    const workspaceStore = useWorkspaceStore.getState();
    await workspaceStore.initWorkspaces();

    const activeWsId = useWorkspaceStore.getState().activeWorkspaceId;

    // 3. Re-load widgets for active workspace
    if (activeWsId) {
      const widgetStore = useWidgetStore.getState();
      await widgetStore.loadWidgets(activeWsId);

      // 4. Re-load layouts
      const layoutStore = useLayoutStore.getState();
      layoutStore.clearPendingDebounce();
      await layoutStore.loadLayouts(activeWsId);
    }

    // 5. Broadcast notification to other open tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nookspace:restore-completed', {
          detail: { timestamp: Date.now() },
        })
      );
    }
  } catch (err) {
    console.warn('[restoreRuntimeSync] Non-fatal error synchronizing runtime stores:', err);
  }
}
