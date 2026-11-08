import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  FileCode,
  Link,
  Minus,
  Columns,
  Eye,
  Edit3,
} from 'lucide-react';

export type NoteEditorViewMode = 'split' | 'edit' | 'preview';

export interface MarkdownToolbarProps {
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void;
  viewMode: NoteEditorViewMode;
  onViewModeChange: (mode: NoteEditorViewMode) => void;
  disabled?: boolean;
}

export function MarkdownToolbar({
  onInsertMarkdown,
  viewMode,
  onViewModeChange,
  disabled = false,
}: MarkdownToolbarProps) {
  const btnClass =
    'p-1.5 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors';
  const activeViewClass =
    'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium';

  return (
    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-1.5 gap-1">
      <div className="flex flex-wrap items-center gap-0.5">
        <button
          type="button"
          onClick={() => onInsertMarkdown('**', '**', 'bold text')}
          className={btnClass}
          title="Bold (Ctrl+B)"
          disabled={disabled || viewMode === 'preview'}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('*', '*', 'italic text')}
          className={btnClass}
          title="Italic (Ctrl+I)"
          disabled={disabled || viewMode === 'preview'}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('~~', '~~', 'strikethrough text')}
          className={btnClass}
          title="Strikethrough"
          disabled={disabled || viewMode === 'preview'}
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => onInsertMarkdown('# ', '', 'Heading 1')}
          className={btnClass}
          title="Heading 1"
          disabled={disabled || viewMode === 'preview'}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('## ', '', 'Heading 2')}
          className={btnClass}
          title="Heading 2"
          disabled={disabled || viewMode === 'preview'}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('### ', '', 'Heading 3')}
          className={btnClass}
          title="Heading 3"
          disabled={disabled || viewMode === 'preview'}
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => onInsertMarkdown('- ', '', 'List item')}
          className={btnClass}
          title="Bullet List"
          disabled={disabled || viewMode === 'preview'}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('1. ', '', 'Numbered item')}
          className={btnClass}
          title="Numbered List"
          disabled={disabled || viewMode === 'preview'}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('- [ ] ', '', 'Task item')}
          className={btnClass}
          title="Task List"
          disabled={disabled || viewMode === 'preview'}
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => onInsertMarkdown('> ', '', 'Quote')}
          className={btnClass}
          title="Blockquote"
          disabled={disabled || viewMode === 'preview'}
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('`', '`', 'code')}
          className={btnClass}
          title="Inline Code"
          disabled={disabled || viewMode === 'preview'}
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('```ts\n', '\n```', 'console.log("hello");')}
          className={btnClass}
          title="Code Block"
          disabled={disabled || viewMode === 'preview'}
        >
          <FileCode className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('[', '](https://example.com)', 'link text')}
          className={btnClass}
          title="Link"
          disabled={disabled || viewMode === 'preview'}
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onInsertMarkdown('\n---\n', '', '')}
          className={btnClass}
          title="Horizontal Rule"
          disabled={disabled || viewMode === 'preview'}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs bg-white dark:bg-slate-800">
        <button
          type="button"
          onClick={() => onViewModeChange('edit')}
          className={`flex items-center gap-1 px-2 py-1 rounded ${
            viewMode === 'edit' ? activeViewClass : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
          title="Editor only"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1 px-2 py-1 rounded ${
            viewMode === 'split' ? activeViewClass : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
          title="Split view"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1 px-2 py-1 rounded ${
            viewMode === 'preview' ? activeViewClass : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
          title="Preview only"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>
    </div>
  );
}
