import React, { useEffect } from 'react';
import { TopNav } from './TopNav';
import { useThemeStore } from '../../stores/themeStore';

export interface AppShellProps {
  children: React.ReactNode;
  workspaceName?: string;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  workspaceName,
  isEditMode,
  onToggleEditMode,
  onOpenSettings,
}) => {
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors selection:bg-neutral-800 selection:text-white">
      <TopNav
        workspaceName={workspaceName}
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
        onOpenSettings={onOpenSettings}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
        {children}
      </main>
      <footer className="w-full py-4 text-center text-[11px] text-muted-foreground/80 border-t border-border/30">
        NookSpace ✦ Local-First Productivity Workspace
      </footer>
    </div>
  );
};
