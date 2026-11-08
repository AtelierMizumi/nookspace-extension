import React from 'react';
import { ChevronDown, Plus, Layers, Check } from 'lucide-react';
import { Dropdown, DropdownItem } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useCustomizationStore } from '../../../stores/customizationStore';
import { getWorkspaceIcon } from './WorkspaceIconPicker';

export interface WorkspaceSwitcherProps {
  onOpenManager?: () => void;
  onOpenCreate?: () => void;
  className?: string;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  onOpenManager,
  onOpenCreate,
  className,
}) => {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const requestWorkspaceSwitch = useCustomizationStore((s) => s.requestWorkspaceSwitch);

  const sortedWorkspaces = [...workspaces].sort((a, b) => a.order - b.order);
  const activeWorkspace =
    sortedWorkspaces.find((w) => w.id === activeWorkspaceId) || sortedWorkspaces[0];

  const handleSelectWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;
    const canSwitch = requestWorkspaceSwitch(workspaceId);
    if (canSwitch === 'ALLOW') {
      setActiveWorkspace(workspaceId);
    }
  };

  const ActiveIconComponent = getWorkspaceIcon(activeWorkspace?.icon);

  const dropdownItems: DropdownItem[] = [
    ...sortedWorkspaces.map((ws, idx) => {
      const WsIcon = getWorkspaceIcon(ws.icon);
      const isActive = ws.id === (activeWorkspace?.id ?? activeWorkspaceId);
      const isLastWorkspace = idx === sortedWorkspaces.length - 1;

      return {
        id: `ws-${ws.id}`,
        checked: isActive,
        label: (
          <div className="flex items-center justify-between w-full min-w-0 pr-1">
            <span
              className={`truncate text-xs ${
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              {ws.name}
            </span>
            {isActive && <Check className="h-3.5 w-3.5 text-primary ml-2 shrink-0" />}
          </div>
        ),
        icon: (
          <div
            className="h-4 w-4 flex items-center justify-center shrink-0"
            style={{ color: ws.color || 'var(--primary)' }}
          >
            <WsIcon className="h-3.5 w-3.5" />
          </div>
        ),
        separatorAfter: isLastWorkspace,
        onClick: () => handleSelectWorkspace(ws.id),
      };
    }),
    {
      id: 'create-workspace-action',
      label: <span className="text-xs">Create Workspace...</span>,
      icon: <Plus className="h-3.5 w-3.5 text-muted-foreground" />,
      separatorAfter: false,
      onClick: onOpenCreate,
    },
    {
      id: 'manage-workspaces-action',
      label: <span className="text-xs">Manage Workspaces...</span>,
      icon: <Layers className="h-3.5 w-3.5 text-muted-foreground" />,
      separatorAfter: false,
      onClick: onOpenManager,
    },
  ];

  return (
    <div className={className}>
      <Dropdown
        items={dropdownItems}
        align="left"
        menuAriaLabel="Switch workspace"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Current workspace: ${activeWorkspace?.name || 'Personal Space'}. Switch workspace.`}
            className="h-8 gap-2 px-2.5 text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div
              className="h-4 w-4 flex items-center justify-center shrink-0"
              style={{ color: activeWorkspace?.color || 'var(--primary)' }}
            >
              <ActiveIconComponent className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[120px] sm:max-w-[150px] md:max-w-[180px] truncate text-foreground font-medium">
              {activeWorkspace?.name || 'Personal Space'}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </Button>
        }
      />
    </div>
  );
};
