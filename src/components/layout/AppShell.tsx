import React, { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { WidgetLibraryModal } from '../../features/widget-system/WidgetLibraryModal';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useWidgetStore } from '../../stores/widgetStore';

export interface AppShellProps {
  children: React.ReactNode;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
  onOpenBookmarkManager?: () => void;
  onOpenNotesManager?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  isEditMode,
  onToggleEditMode,
  onOpenSettings,
  onOpenBookmarkManager,
  onOpenNotesManager,
}) => {
  const { initializeTheme } = useThemeStore();
  const { initWorkspaces, activeWorkspaceId, isLoading: isWorkspaceLoading } = useWorkspaceStore();
  const { instances, loadWidgets, addWidget, removeWidget } = useWidgetStore();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    initializeTheme();
    initWorkspaces();
  }, [initializeTheme, initWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId && !isWorkspaceLoading) {
      loadWidgets(activeWorkspaceId);
    }
  }, [activeWorkspaceId, isWorkspaceLoading, loadWidgets]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors selection:bg-neutral-800 selection:text-white">
      <TopNav
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
        onOpenSettings={onOpenSettings}
        onOpenWidgetLibrary={() => setIsLibraryOpen(true)}
        onOpenBookmarkManager={onOpenBookmarkManager}
        onOpenNotesManager={onOpenNotesManager}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
        {children}
      </main>

      <footer className="w-full py-4 text-center text-[11px] text-muted-foreground/80 border-t border-border/30">
        NookSpace ✦ Local-First Productivity Workspace
      </footer>

      {/* Global Widget Library Modal */}
      <WidgetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        workspaceId={activeWorkspaceId}
        activeInstances={instances}
        onAddWidget={(type) => addWidget(activeWorkspaceId, type)}
        onRemoveWidget={(id) => removeWidget(id, activeWorkspaceId)}
      />
    </div>
  );
};
