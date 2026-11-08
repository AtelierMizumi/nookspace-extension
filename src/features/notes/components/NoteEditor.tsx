import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pin,
  Star,
  Archive,
  Trash2,
  Folder,
  Tag as TagIcon,
  X,
  Plus,
} from 'lucide-react';
import { NoteEntity, NoteCollectionEntity, NoteTagEntity } from '../../../types/notes';
import { BookmarkEntity } from '../../../types/bookmarks';
import { useBookmarkStore } from '../../bookmarks/stores/bookmarkStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownToolbar, NoteEditorViewMode } from './MarkdownToolbar';
import { LinkedBookmarksSection } from './LinkedBookmarksSection';
import { LinkBookmarkModal } from './LinkBookmarkModal';

export interface NoteEditorProps {
  note: NoteEntity;
  collections: NoteCollectionEntity[];
  tags: NoteTagEntity[];
  linkedBookmarks?: BookmarkEntity[];
  onUpdate: (id: string, updates: Partial<NoteEntity>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onToggleArchive: (id: string) => Promise<void>;
  onLinkBookmark?: (bookmarkId: string) => Promise<void>;
  onUnlinkBookmark?: (bookmarkId: string) => Promise<void>;
}

export function NoteEditor({
  note,
  collections,
  tags,
  linkedBookmarks = [],
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onLinkBookmark,
  onUnlinkBookmark,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [viewMode, setViewMode] = useState<NoteEditorViewMode>('split');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setIsDeleting(false);
    setShowTagInput(false);
  }, [note.id]);

  // Debounced auto-save for content
  const debouncedSaveContent = useCallback(
    (newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate(note.id, { content: newContent });
      }, 500);
    },
    [note.id, onUpdate]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (nextTitle.trim()) {
        onUpdate(note.id, { title: nextTitle.trim() });
      }
    }, 400);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== note.title) {
      onUpdate(note.id, { title: title.trim() });
    } else if (!title.trim()) {
      setTitle(note.title);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = e.target.value;
    setContent(nextContent);
    debouncedSaveContent(nextContent);
  };

  // Keyboard shortcuts & auto list continuation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Ctrl+B / Cmd+B -> Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
      return;
    }

    // Ctrl+I / Cmd+I -> Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
      return;
    }

    // Tab -> 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextContent = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      setContent(nextContent);
      debouncedSaveContent(nextContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
      return;
    }

    // Enter -> Auto list continuation
    if (e.key === 'Enter') {
      const currentLine = value.substring(0, selectionStart).split('\n').pop() || '';

      // Check task list: - [ ] or - [x]
      const taskMatch = currentLine.match(/^(\s*[-*+]\s+\[[ xX]\]\s+)(.*)$/);
      if (taskMatch) {
        if (!taskMatch[2].trim()) {
          // Empty task item -> exit list
          e.preventDefault();
          const startOfLine = selectionStart - currentLine.length;
          const next = value.substring(0, startOfLine) + value.substring(selectionStart);
          setContent(next);
          debouncedSaveContent(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = startOfLine;
          }, 0);
          return;
        }
        e.preventDefault();
        const prefix = '\n- [ ] ';
        const next = value.substring(0, selectionStart) + prefix + value.substring(selectionEnd);
        setContent(next);
        debouncedSaveContent(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length;
        }, 0);
        return;
      }

      // Check bullet list: - or * or +
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
      if (bulletMatch) {
        if (!bulletMatch[2].trim()) {
          // Empty bullet -> exit list
          e.preventDefault();
          const startOfLine = selectionStart - currentLine.length;
          const next = value.substring(0, startOfLine) + value.substring(selectionStart);
          setContent(next);
          debouncedSaveContent(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = startOfLine;
          }, 0);
          return;
        }
        e.preventDefault();
        const prefix = `\n${bulletMatch[1]}`;
        const next = value.substring(0, selectionStart) + prefix + value.substring(selectionEnd);
        setContent(next);
        debouncedSaveContent(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length;
        }, 0);
        return;
      }

      // Check ordered list: 1.
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (!numMatch[3].trim()) {
          // Empty number item -> exit list
          e.preventDefault();
          const startOfLine = selectionStart - currentLine.length;
          const next = value.substring(0, startOfLine) + value.substring(selectionStart);
          setContent(next);
          debouncedSaveContent(next);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = startOfLine;
          }, 0);
          return;
        }
        e.preventDefault();
        const nextNum = parseInt(numMatch[2], 10) + 1;
        const prefix = `\n${numMatch[1]}${nextNum}. `;
        const next = value.substring(0, selectionStart) + prefix + value.substring(selectionEnd);
        setContent(next);
        debouncedSaveContent(next);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + prefix.length;
        }, 0);
        return;
      }
    }
  };

  const insertFormatting = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.substring(selectionStart, selectionEnd) || defaultText;
    const replacement = prefix + selectedText + suffix;

    const nextContent = value.substring(0, selectionStart) + replacement + value.substring(selectionEnd);
    setContent(nextContent);
    debouncedSaveContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = selectionStart + prefix.length;
      textarea.selectionEnd = selectionStart + prefix.length + selectedText.length;
    }, 0);
  };

  // Interactive task toggle in preview
  const handleTaskToggle = (targetTaskIndex: number, newCheckedState: boolean) => {
    let taskIdx = 0;
    const lines = content.split('\n');
    const updatedLines = lines.map((line) => {
      const match = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
      if (match) {
        if (taskIdx === targetTaskIndex) {
          taskIdx++;
          return `${match[1]}${newCheckedState ? 'x' : ' '}${match[3]}`;
        }
        taskIdx++;
      }
      return line;
    });

    const nextContent = updatedLines.join('\n');
    setContent(nextContent);
    onUpdate(note.id, { content: nextContent });
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onUpdate(note.id, { collectionId: val === 'none' ? null : val });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = note.tags.filter((t) => t !== tagToRemove);
    onUpdate(note.id, { tags: nextTags });
  };

  const handleAddTag = () => {
    const clean = newTagText.trim().toLowerCase();
    if (clean && !note.tags.includes(clean)) {
      onUpdate(note.id, { tags: [...note.tags, clean] });
      setNewTagText('');
      setShowTagInput(false);
    }
  };

  // Word and character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Note title..."
            className="w-full text-lg font-bold text-slate-900 dark:text-white bg-transparent border-0 focus:ring-0 p-0 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              note.isPinned ? 'text-amber-500 fill-amber-500' : ''
            }`}
            title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(note.id)}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              note.isFavorite ? 'text-yellow-500 fill-yellow-500' : ''
            }`}
            title={note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onToggleArchive(note.id)}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              note.isArchived ? 'text-purple-500' : ''
            }`}
            title={note.isArchived ? 'Unarchive Note' : 'Archive Note'}
          >
            <Archive className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

          {isDeleting ? (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded border border-red-200 dark:border-red-900/60">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
              <button
                type="button"
                onClick={() => onDelete(note.id)}
                className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta Bar: Collection & Tags */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={note.collectionId || 'none'}
            onChange={handleCollectionChange}
            className="bg-transparent border-0 text-xs text-slate-700 dark:text-slate-300 focus:ring-0 p-0 cursor-pointer font-medium"
          >
            <option value="none">Uncategorized</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <TagIcon className="w-3.5 h-3.5 text-slate-400" />
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {showTagInput ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
                placeholder="tag name..."
                className="text-xs px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-24"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="text-[11px] px-1.5 py-0.5 rounded bg-blue-600 text-white"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowTagInput(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-0.5 text-slate-500 hover:text-blue-500 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              Add tag
            </button>
          )}
        </div>
      </div>

      {/* Linked Bookmarks Section */}
      <LinkedBookmarksSection
        linkedBookmarks={linkedBookmarks}
        onOpenLinkModal={() => setIsLinkModalOpen(true)}
        onUnlink={async (bmId) => {
          if (onUnlinkBookmark) {
            await onUnlinkBookmark(bmId);
          }
        }}
      />

      {/* Link Bookmark Modal */}
      {isLinkModalOpen && (
        <LinkBookmarkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          noteTitle={note.title}
          noteId={note.id}
          workspaceId={note.workspaceId}
          linkedBookmarkIds={linkedBookmarks.map((b) => b.id)}
          bookmarks={useBookmarkStore.getState().bookmarks}
          groups={useBookmarkStore.getState().groups}
          onLinkBookmark={async (bmId) => {
            if (onLinkBookmark) {
              await onLinkBookmark(bmId);
            }
          }}
          onUnlinkBookmark={async (bmId) => {
            if (onUnlinkBookmark) {
              await onUnlinkBookmark(bmId);
            }
          }}
        />
      )}

      {/* Toolbar */}
      <MarkdownToolbar
        onInsertMarkdown={insertFormatting}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 h-full p-4 overflow-y-auto ${
              viewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-800' : ''
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your note in Markdown..."
              className="w-full h-full resize-none font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:ring-0 p-0 outline-none"
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 h-full p-4 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
            <MarkdownRenderer content={content} onTaskToggle={handleTaskToggle} />
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
        </div>
        <div>
          Last updated {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
