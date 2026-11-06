import React, { useState } from 'react';
import { Bookmark, Plus, Trash2, ExternalLink } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { browserApi } from '../services/browser';
import { Button, IconButton } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

interface QuickLinksConfig {
  links?: LinkItem[];
}

export const QuickLinksWidgetComponent: React.FC<WidgetProps<QuickLinksConfig>> = ({
  config,
  onUpdateConfig,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const links: LinkItem[] = config?.links || [
    { id: '1', title: 'GitHub', url: 'https://github.com' },
    { id: '2', title: 'Notion', url: 'https://notion.so' },
    { id: '3', title: 'YouTube', url: 'https://youtube.com' },
  ];

  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const title = newTitle.trim() || new URL(url).hostname.replace('www.', '');
    const updated = [...links, { id: `link-${Date.now()}`, title, url }];
    onUpdateConfig({ links: updated });
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = links.filter((l) => l.id !== id);
    onUpdateConfig({ links: updated });
  };

  const handleOpen = (url: string) => {
    browserApi.tabs.create(url);
  };

  return (
    <div className="h-full flex flex-col justify-between text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Bookmark className="h-3.5 w-3.5 text-primary" />
          Quick Shortcuts
        </span>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Add Shortcut"
          onClick={() => setIsAdding(!isAdding)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {isAdding && (
        <div className="my-2 p-2 rounded-lg bg-secondary/50 border border-border/50 space-y-2 animate-in fade-in duration-100">
          <Input
            placeholder="URL (e.g. google.com)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-6 text-[10px]">
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleAddLink} className="h-6 text-[10px]">
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 py-2 pr-1">
        {links.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">No shortcuts saved.</p>
        ) : (
          links.map((link) => {
            const monogram = browserApi.utils.getDomainMonogram(link.url);
            return (
              <div
                key={link.id}
                onClick={() => handleOpen(link.url)}
                className="group flex items-center justify-between p-1.5 rounded-lg border border-border/40 bg-card hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                    style={{ backgroundColor: monogram.color }}
                  >
                    {monogram.letter}
                  </div>
                  <span className="font-medium truncate text-foreground text-[11px]">{link.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={(e) => handleDelete(link.id, e)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30">
        Click to open in new tab
      </div>
    </div>
  );
};

export const QuickLinksWidget: WidgetDefinition<QuickLinksConfig> = {
  type: 'quick-links',
  name: 'Quick Links',
  description: 'Fast access website shortcuts with automatic monograms.',
  category: 'organization',
  icon: Bookmark,
  defaultConfig: {
    links: [
      { id: '1', title: 'GitHub', url: 'https://github.com' },
      { id: '2', title: 'Notion', url: 'https://notion.so' },
      { id: '3', title: 'YouTube', url: 'https://youtube.com' },
    ],
  },
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: QuickLinksWidgetComponent,
};
