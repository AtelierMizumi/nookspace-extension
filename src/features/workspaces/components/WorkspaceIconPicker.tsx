import React from 'react';
import {
  LayoutGrid,
  Home,
  Briefcase,
  GraduationCap,
  BookOpen,
  Code,
  Laptop,
  Terminal,
  Coffee,
  Palette,
  Lightbulb,
  Folder,
  Rocket,
  Target,
  Sparkles,
  Globe,
  Gamepad2,
  Calendar,
  LucideIcon,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export const WORKSPACE_ICONS: Record<string, { label: string; icon: LucideIcon }> = {
  LayoutGrid: { label: 'Grid', icon: LayoutGrid },
  Home: { label: 'Home', icon: Home },
  Briefcase: { label: 'Work', icon: Briefcase },
  GraduationCap: { label: 'Study', icon: GraduationCap },
  BookOpen: { label: 'Reading', icon: BookOpen },
  Code: { label: 'Developer', icon: Code },
  Laptop: { label: 'Computer', icon: Laptop },
  Terminal: { label: 'Terminal', icon: Terminal },
  Coffee: { label: 'Coffee', icon: Coffee },
  Palette: { label: 'Creative', icon: Palette },
  Lightbulb: { label: 'Ideas', icon: Lightbulb },
  Folder: { label: 'Projects', icon: Folder },
  Rocket: { label: 'Launch', icon: Rocket },
  Target: { label: 'Goals', icon: Target },
  Sparkles: { label: 'Personal', icon: Sparkles },
  Globe: { label: 'Web', icon: Globe },
  Gamepad2: { label: 'Gaming', icon: Gamepad2 },
  Calendar: { label: 'Schedule', icon: Calendar },
};

/**
 * Returns a type-safe Lucide component for any given icon string identifier,
 * falling back safely to LayoutGrid if the string is unrecognized.
 */
export function getWorkspaceIcon(iconName?: string): LucideIcon {
  if (!iconName) return LayoutGrid;
  return WORKSPACE_ICONS[iconName]?.icon || LayoutGrid;
}

export interface WorkspaceIconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export const WorkspaceIconPicker: React.FC<WorkspaceIconPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const iconKeys = Object.keys(WORKSPACE_ICONS);

  const handleKeyDown = (e: React.KeyboardEvent, currentKey: string) => {
    const currentIndex = iconKeys.indexOf(currentKey);
    if (currentIndex === -1) return;

    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % iconKeys.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + iconKeys.length) % iconKeys.length;
    }

    if (targetIndex !== -1) {
      onChange(iconKeys[targetIndex]);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label id="workspace-icon-label" className="text-xs font-medium text-foreground block">
        Workspace Icon
      </label>
      <div
        role="radiogroup"
        aria-labelledby="workspace-icon-label"
        className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 bg-secondary/30 rounded-lg border border-border/50 max-h-36 overflow-y-auto"
      >
        {iconKeys.map((key) => {
          const item = WORKSPACE_ICONS[key];
          const IconComp = item.icon;
          const isSelected = value === key;

          return (
            <button
              key={key}
              type="button"
              role="radio"
              tabIndex={isSelected ? 0 : -1}
              aria-checked={isSelected}
              aria-label={key}
              title={item.label}
              onClick={() => onChange(key)}
              onKeyDown={(e) => handleKeyDown(e, key)}
              className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <IconComp className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
