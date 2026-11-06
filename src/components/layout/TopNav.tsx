import React from 'react';
import {
  Sun,
  Moon,
  Monitor,
  LayoutGrid,
  ChevronDown,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { useThemeStore } from '../../stores/themeStore';

export interface TopNavProps {
  workspaceName?: string;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onOpenSettings?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  workspaceName = 'Personal',
  isEditMode = false,
  onToggleEditMode,
  onOpenSettings,
}) => {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

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

  const workspaceDropdownItems: DropdownItem[] = [
    {
      id: 'ws-personal',
      label: 'Personal Space',
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      onClick: () => {},
    },
    {
      id: 'ws-study',
      label: 'Study & Deep Work',
      icon: <LayoutGrid className="h-4 w-4 text-emerald-500" />,
      onClick: () => {},
    },
    {
      id: 'ws-dev',
      label: 'Developer Studio',
      icon: <Settings className="h-4 w-4 text-indigo-400" />,
      onClick: () => {},
    },
  ];

  return (
    <header className="w-full flex items-center justify-between px-6 py-3 border-b border-border/60 bg-card/40 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Left: Brand & Workspace Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-border/50">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shadow-sm select-none">
            N
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground select-none">
            NookSpace
          </span>
          <Badge variant="secondary" size="sm" className="hidden sm:inline-flex">
            Phase 1
          </Badge>
        </div>

        {/* Workspace Switcher Trigger */}
        <Dropdown
          items={workspaceDropdownItems}
          align="left"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium text-foreground hover:bg-secondary/70"
            >
              <span className="max-w-[120px] truncate">{workspaceName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          }
        />
      </div>

      {/* Right: Search, Customize, Theme, Settings */}
      <div className="flex items-center gap-2">
        <Tooltip content="Quick Search (Cmd+K)" position="bottom">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            className="h-8 text-xs text-muted-foreground px-2.5 hidden md:inline-flex"
          >
            Search...
          </Button>
        </Tooltip>

        <Tooltip content={isEditMode ? 'Exit Customization' : 'Customize Workspace'} position="bottom">
          <Button
            variant={isEditMode ? 'primary' : 'outline'}
            size="sm"
            onClick={onToggleEditMode}
            leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
            className="h-8 text-xs font-medium"
          >
            {isEditMode ? 'Done Editing' : 'Customize'}
          </Button>
        </Tooltip>

        {/* Theme Mode Dropdown */}
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
  );
};
