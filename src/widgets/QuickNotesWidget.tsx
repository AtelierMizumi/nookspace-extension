import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';

interface NotesConfig {
  content?: string;
}

export const QuickNotesWidgetComponent: React.FC<WidgetProps<NotesConfig>> = ({
  config,
  onUpdateConfig,
}) => {
  const [content, setContent] = useState(config?.content || '');

  // Keep internal state synchronized with config if external updates arrive
  useEffect(() => {
    if (config?.content !== undefined) {
      setContent(config.content);
    }
  }, [config?.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    onUpdateConfig({ content: val });
  };

  return (
    <div className="h-full flex flex-col justify-between text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Scratchpad
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {content.length} chars
        </span>
      </div>

      <div className="flex-1 py-1.5">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Capture quick thoughts, references, or reminders..."
          className="w-full h-full p-2 rounded-lg bg-secondary/30 border border-transparent focus:border-border text-foreground text-xs leading-relaxed resize-none focus:outline-none"
        />
      </div>

      <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30 flex justify-between">
        <span>Autosaved locally</span>
        <span>Markdown ready</span>
      </div>
    </div>
  );
};

export const QuickNotesWidget: WidgetDefinition<NotesConfig> = {
  type: 'quick-notes',
  name: 'Quick Notes',
  description: 'Instant scratchpad note for fleeting thoughts and links.',
  category: 'organization',
  icon: FileText,
  defaultConfig: {
    content: '💡 NookSpace Phase 2: Widget System active.\nCustomize your workspace with modular widgets.',
  },
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: QuickNotesWidgetComponent,
};
