import React, { useState } from 'react';
import { Search, Plus, Check, Trash2 } from 'lucide-react';
import { widgetRegistry } from './WidgetRegistry';
import { WidgetCategory, WidgetDefinition } from './types';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { WidgetInstanceEntity } from '../../types/database';

export interface WidgetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  activeInstances: WidgetInstanceEntity[];
  onAddWidget: (widgetType: string) => void;
  onRemoveWidget: (instanceId: string) => void;
}

const categories: { id: WidgetCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Widgets' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'organization', label: 'Organization' },
  { id: 'personal', label: 'Personal' },
  { id: 'utilities', label: 'Utilities' },
];

export const WidgetLibraryModal: React.FC<WidgetLibraryModalProps> = ({
  isOpen,
  onClose,
  activeInstances,
  onAddWidget,
  onRemoveWidget,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');

  const allDefinitions = widgetRegistry.getAll();

  const filtered = allDefinitions.filter((def) => {
    const matchesCategory =
      selectedCategory === 'all' || def.category === selectedCategory;
    const matchesSearch =
      def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Widget Library"
      description="Select and add modular widgets to customize your current workspace."
      size="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Search & Category filter */}
        <div className="space-y-2.5">
          <Input
            leftIcon={<Search className="h-3.5 w-3.5" />}
            placeholder="Search widgets by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors select-none ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground text-xs">
              No widgets match your search criteria.
            </div>
          ) : (
            filtered.map((def: WidgetDefinition) => {
              const Icon = def.icon;
              const matchingInstance = activeInstances.find(
                (inst) => inst.widgetType === def.type
              );
              const isAdded = Boolean(matchingInstance);

              return (
                <div
                  key={def.type}
                  className="p-3 rounded-xl border border-border/60 bg-card hover:border-border transition-colors flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-semibold text-foreground text-xs truncate">
                          {def.name}
                        </h4>
                        <Badge variant="outline" size="sm" className="capitalize text-[9px] px-1.5">
                          {def.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Size: {def.defaultDimensions.w}x{def.defaultDimensions.h}
                    </span>
                    {isAdded ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" /> Added
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => matchingInstance && onRemoveWidget(matchingInstance.id)}
                          className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => onAddWidget(def.type)}
                        className="h-6 px-2.5 text-[11px]"
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
