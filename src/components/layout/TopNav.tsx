import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  Settings,
  Plus,
  Bookmark,
  FileText,
} from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTranslation } from '../../services/i18n';
import {
  WorkspaceSwitcher,
  WorkspaceManagerModal,
  WorkspaceFormModal,
} from '../../features/workspaces';

export interface TopNavProps {
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
  onOpenWidgetLibrary?: () => void;
  onOpenBookmarkManager?: () => void;
  onOpenNotesManager?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isEditMode = false,
  onToggleEditMode,
  onOpenSettings,
  onOpenWidgetLibrary,
  onOpenBookmarkManager,
  onOpenNotesManager,
}) => {
  const { resolvedTheme, setTheme } = useThemeStore();
  const { createWorkspace, createWorkspaceFromPreset } = useWorkspaceStore();

  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isWorkspaceCreateOpen, setIsWorkspaceCreateOpen] = useState(false);

  const handleCreateWorkspace = async (data: {
    name: string;
    icon: string;
    color?: string;
    presetId?: string | null;
  }) => {
    if (data.presetId) {
      await createWorkspaceFromPreset({
        presetId: data.presetId,
        name: data.name,
        icon: data.icon,
        color: data.color,
      });
    } else {
      await createWorkspace(data.name, data.icon, data.color);
    }
    setIsWorkspaceCreateOpen(false);
  };

  const { t } = useTranslation();

  const themeDropdownItems: DropdownItem[] = [
    {
      id: 'theme-light',
      label: t('topNav.lightTheme'),
      icon: <Sun className="h-4 w-4 text-amber-500" />,
      onClick: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      label: t('topNav.darkTheme'),
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
      onClick: () => setTheme('dark'),
    },
    {
      id: 'theme-system',
      label: t('topNav.systemTheme'),
      icon: <Monitor className="h-4 w-4 text-muted-foreground" />,
      onClick: () => setTheme('system'),
    },
  ];

  return (
    <>
      <header className="w-full flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-border/60 bg-card/40 backdrop-blur-md sticky top-0 z-40 transition-colors">
        {/* Left: Brand & Live Workspace Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-3 border-r border-border/50 shrink-0">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shadow-sm select-none">
              N
            </div>
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-foreground select-none hidden xs:inline">
              NookSpace
            </span>
            <Badge variant="secondary" size="sm" className="hidden lg:inline-flex text-[10px]">
              v0.1.0
            </Badge>
          </div>

          {/* Workspace Switcher */}
          <WorkspaceSwitcher
            onOpenManager={() => setIsWorkspaceManagerOpen(true)}
            onOpenCreate={() => setIsWorkspaceCreateOpen(true)}
          />
        </div>

        {/* Right: Add Widget, Customize, Theme, Settings */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onOpenNotesManager && (
            <Tooltip content={t('topNav.notes')} position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenNotesManager}
                aria-label={t('topNav.notes')}
                leftIcon={<FileText className="h-3.5 w-3.5 text-primary" />}
                className="h-8 px-2 sm:px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
              >
                <span className="hidden md:inline">{t('topNav.notes')}</span>
              </Button>
            </Tooltip>
          )}

          {onOpenBookmarkManager && (
            <Tooltip content={t('topNav.bookmarks')} position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenBookmarkManager}
                aria-label={t('topNav.bookmarks')}
                leftIcon={<Bookmark className="h-3.5 w-3.5 text-primary" />}
                className="h-8 px-2 sm:px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
              >
                <span className="hidden md:inline">{t('topNav.bookmarks')}</span>
              </Button>
            </Tooltip>
          )}

          {onOpenWidgetLibrary && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenWidgetLibrary}
              aria-label={t('topNav.addWidget')}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="h-8 px-2 sm:px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
            >
              <span className="hidden sm:inline">{t('topNav.addWidget')}</span>
            </Button>
          )}

          <Tooltip content={isEditMode ? t('topNav.doneEditing') : t('topNav.editLayout')} position="bottom">
            <Button
              variant={isEditMode ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleEditMode}
              aria-label={isEditMode ? t('topNav.doneEditing') : t('topNav.editLayout')}
              leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
              className="h-8 px-2 sm:px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary"
            >
              <span className="hidden sm:inline">{isEditMode ? t('topNav.doneEditing') : t('common.edit')}</span>
            </Button>
          </Tooltip>

          {/* Theme Dropdown */}
          <Dropdown
            items={themeDropdownItems}
            align="right"
            menuAriaLabel="Theme selection"
            trigger={
              <IconButton
                size="sm"
                variant="outline"
                aria-label="Theme selector"
                className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
              </IconButton>
            }
          />

          <Tooltip content={t('preferences.title')} position="bottom">
            <IconButton
              size="sm"
              variant="outline"
              aria-label={t('preferences.title')}
              onClick={onOpenSettings}
              className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary"
            >
              <Settings className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      {/* Workspace Manager Modal */}
      <WorkspaceManagerModal
        isOpen={isWorkspaceManagerOpen}
        onClose={() => setIsWorkspaceManagerOpen(false)}
        onOpenCreate={() => {
          setIsWorkspaceManagerOpen(false);
          setIsWorkspaceCreateOpen(true);
        }}
      />

      {/* New Workspace Creation Modal */}
      <WorkspaceFormModal
        isOpen={isWorkspaceCreateOpen}
        onClose={() => setIsWorkspaceCreateOpen(false)}
        mode="create"
        onSubmitCreate={handleCreateWorkspace}
      />
    </>
  );
};
