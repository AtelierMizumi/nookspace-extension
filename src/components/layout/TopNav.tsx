import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  ChevronDown,
  Search,
  Settings,
  Plus,
} from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCustomizationStore } from '../../stores/customizationStore';

export interface TopNavProps {
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
  onOpenWidgetLibrary?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  isEditMode = false,
  onToggleEditMode,
  onOpenSettings,
  onOpenWidgetLibrary,
}) => {
  const { resolvedTheme, setTheme } = useThemeStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, createWorkspace } = useWorkspaceStore();
  const requestWorkspaceSwitch = useCustomizationStore((s) => s.requestWorkspaceSwitch);
  const [isNewWsModalOpen, setIsNewWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim());
    setNewWsName('');
    setIsNewWsModalOpen(false);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    const result = requestWorkspaceSwitch(workspaceId);
    if (result === 'ALLOW') {
      setActiveWorkspace(workspaceId);
    }
  };

  const workspaceDropdownItems: DropdownItem[] = [
    ...workspaces.map((ws) => ({
      id: ws.id,
      label: ws.name,
      icon: <LayoutGrid className="h-4 w-4 text-primary" />,
      onClick: () => handleSelectWorkspace(ws.id),
    })),
    {
      id: 'create-new-workspace',
      label: 'Create Workspace...',
      icon: <Plus className="h-4 w-4 text-muted-foreground" />,
      separatorAfter: false,
      onClick: () => setIsNewWsModalOpen(true),
    },
  ];

  const themeDropdownItems: DropdownItem[] = [
    {
      id: 'theme-light',
      label: 'Light Mode',
      icon: <Sun className="h-4 w-4 text-amber-500" />,
      onClick: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      label: 'Dark Mode',
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
      onClick: () => setTheme('dark'),
    },
    {
      id: 'theme-system',
      label: 'System Preference',
      icon: <Monitor className="h-4 w-4 text-muted-foreground" />,
      onClick: () => setTheme('system'),
    },
  ];

  return (
    <>
      <header className="w-full flex items-center justify-between px-6 py-2.5 border-b border-border/60 bg-card/40 backdrop-blur-md sticky top-0 z-40 transition-colors">
        {/* Left: Brand & Live Workspace Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-border/50">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shadow-sm select-none">
              N
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground select-none">
              NookSpace
            </span>
            <Badge variant="secondary" size="sm" className="hidden sm:inline-flex text-[10px]">
              v0.1.0
            </Badge>
          </div>

          {/* Workspace Switcher Dropdown */}
          <Dropdown
            items={workspaceDropdownItems}
            align="left"
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium text-foreground hover:bg-secondary/70"
              >
                <span className="max-w-[140px] truncate">{activeWorkspace?.name || 'Personal Space'}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            }
          />
        </div>

        {/* Right: Add Widget, Customize, Theme, Settings */}
        <div className="flex items-center gap-2">
          {onOpenWidgetLibrary && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenWidgetLibrary}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="h-8 text-xs font-medium"
            >
              Add Widget
            </Button>
          )}

          <Tooltip content={isEditMode ? 'Exit Customization' : 'Customize Workspace'} position="bottom">
            <Button
              variant={isEditMode ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleEditMode}
              leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
              className="h-8 text-xs font-medium"
            >
              {isEditMode ? 'Done' : 'Customize'}
            </Button>
          </Tooltip>

          {/* Theme Dropdown */}
          <Dropdown
            items={themeDropdownItems}
            align="right"
            trigger={
              <IconButton
                size="sm"
                variant="outline"
                aria-label="Theme selector"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
              </IconButton>
            }
          />

          <Tooltip content="Preferences" position="bottom">
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Settings"
              onClick={onOpenSettings}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      {/* New Workspace Creation Modal */}
      <Modal
        isOpen={isNewWsModalOpen}
        onClose={() => setIsNewWsModalOpen(false)}
        title="Create New Workspace"
        description="Add a dedicated space for studying, projects, or work."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsNewWsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateWorkspace}>
              Create Workspace
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">Workspace Name</label>
            <Input
              autoFocus
              placeholder="e.g. Japanese Study, Project Alpha, Work..."
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </>
  );
};
