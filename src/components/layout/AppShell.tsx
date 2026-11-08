import React, { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { WidgetLibraryModal } from '../../features/widget-system/WidgetLibraryModal';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useWidgetStore } from '../../stores/widgetStore';
import { useTranslation } from '../../services/i18n';

export interface AppShellProps {
  children: React.ReactNode;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
  onOpenBookmarkManager?: () => void;
  onOpenNotesManager?: () => void;
  onOpenUserGuide?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  isEditMode,
  onToggleEditMode,
  onOpenSettings,
  onOpenBookmarkManager,
  onOpenNotesManager,
  onOpenUserGuide,
}) => {
  const { initializeTheme } = useThemeStore();
  const { settings, customBackgroundUrl, loadSettings } = useSettingsStore();
  const { initWorkspaces, activeWorkspaceId, isLoading: isWorkspaceLoading } = useWorkspaceStore();
  const { instances, loadWidgets, addWidget, removeWidget } = useWidgetStore();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    initializeTheme();
    loadSettings();
    initWorkspaces();
  }, [initializeTheme, loadSettings, initWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId && !isWorkspaceLoading) {
      loadWidgets(activeWorkspaceId);
    }
  }, [activeWorkspaceId, isWorkspaceLoading, loadWidgets]);

  const { t } = useTranslation();

  const isCustomBg = settings?.backgroundType === 'image';
  const effectiveBgUrl = isCustomBg
    ? settings.backgroundValue === 'local_upload'
      ? customBackgroundUrl
      : settings.backgroundValue
    : null;

  const bgMode = settings?.backgroundMode || 'cover';
  const bgOverlay = settings?.backgroundOverlay !== undefined ? settings.backgroundOverlay : 50;

  const getBackgroundStyles = (): React.CSSProperties => {
    if (!effectiveBgUrl) return {};
    const styles: React.CSSProperties = {
      backgroundImage: `url("${effectiveBgUrl}")`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };

    switch (bgMode) {
      case 'contain':
        styles.backgroundSize = 'contain';
        break;
      case 'stretch':
        styles.backgroundSize = '100% 100%';
        break;
      case 'center':
        styles.backgroundSize = 'auto';
        break;
      case 'cover':
      default:
        styles.backgroundSize = 'cover';
        break;
    }
    return styles;
  };

  return (
    <div
      className={`min-h-screen min-h-[100dvh] w-full flex flex-col text-foreground transition-colors selection:bg-neutral-800 selection:text-white overflow-x-hidden box-border relative ${
        effectiveBgUrl ? 'bg-transparent' : 'bg-background'
      }`}
    >
      {/* Custom Background Image & Overlay */}
      {effectiveBgUrl && (
        <>
          <div
            className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
            style={getBackgroundStyles()}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
            style={{
              backgroundColor: '#000000',
              opacity: bgOverlay / 100,
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Main Content Layers */}
      <div className="relative z-10 flex flex-col min-h-screen min-h-[100dvh] w-full">
        <TopNav
          isEditMode={isEditMode}
          onToggleEditMode={onToggleEditMode}
          onOpenSettings={onOpenSettings}
          onOpenWidgetLibrary={() => setIsLibraryOpen(true)}
          onOpenBookmarkManager={onOpenBookmarkManager}
          onOpenNotesManager={onOpenNotesManager}
          onOpenUserGuide={onOpenUserGuide}
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col">
          {children}
        </main>

        <footer className="w-full py-3.5 text-center text-[11px] text-muted-foreground/80 border-t border-border/30 select-none">
          {t('appShell.footer') || 'NookSpace ✦ Local-First Productivity Workspace'}
        </footer>
      </div>

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
