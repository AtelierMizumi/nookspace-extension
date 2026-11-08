import React, { useState } from 'react';
import { BookmarkEntity } from '../../../types/bookmarks';
import { extractDomain } from '../services/bookmarkSearchService';
import { isSafeIconUrl } from '../utils/bookmarkSecurity';
import { IconButton } from '../../../components/ui/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import {
  Globe,
  Star,
  ExternalLink,
  Edit2,
  FolderInput,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  FileText,
} from 'lucide-react';

export interface BookmarkItemProps {
  bookmark: BookmarkEntity;
  groupName?: string;
  linkedNotesCount?: number;
  onOpen: (bookmark: BookmarkEntity) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (bookmark: BookmarkEntity) => void;
  onMove: (bookmark: BookmarkEntity) => void;
  onDelete: (id: string) => void;
  onCreateNote?: (bookmark: BookmarkEntity) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  groupName,
  linkedNotesCount,
  onOpen,
  onToggleFavorite,
  onEdit,
  onMove,
  onDelete,
  onCreateNote,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isDraggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [imageError, setImageError] = useState(false);
  const domain = extractDomain(bookmark.url) || bookmark.url;

  const hasSafeIcon = Boolean(
    bookmark.iconUrl && isSafeIconUrl(bookmark.iconUrl) && !imageError
  );

  return (
    <div
      role="listitem"
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card hover:bg-secondary/40 transition-colors shadow-sm gap-3"
    >
      {/* Left section: drag handle, icon, title, domain, description */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag handle or reorder visual */}
        {isDraggable && (
          <div
            className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Favicon or Fallback Icon */}
        <div className="h-8 w-8 rounded-md bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
          {hasSafeIcon ? (
            <img
              src={bookmark.iconUrl}
              alt=""
              onError={() => setImageError(true)}
              className="h-4 w-4 object-contain"
              loading="lazy"
            />
          ) : (
            <Globe className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(bookmark)}
              className="font-medium text-xs text-foreground hover:text-primary hover:underline truncate text-left focus:outline-none focus:ring-1 focus:ring-ring rounded"
              title={`Open ${bookmark.title}`}
            >
              {bookmark.title}
            </button>
            {groupName && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/40 shrink-0 hidden sm:inline">
                {groupName}
              </span>
            )}
            {typeof linkedNotesCount === 'number' && linkedNotesCount > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 font-medium"
                title={`${linkedNotesCount} linked note${linkedNotesCount > 1 ? 's' : ''}`}
              >
                <FileText className="h-2.5 w-2.5" />
                <span>{linkedNotesCount}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground truncate">{domain}</span>
            {bookmark.description && (
              <>
                <span className="text-muted-foreground/50 text-[10px] hidden md:inline">•</span>
                <span className="text-[11px] text-muted-foreground/75 truncate hidden md:inline max-w-xs">
                  {bookmark.description}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right section: action controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Toggle Favorite Star */}
        <Tooltip content={bookmark.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={bookmark.isFavorite ? 'Unfavorite bookmark' : 'Favorite bookmark'}
            onClick={() => onToggleFavorite(bookmark.id)}
            className={`h-7 w-7 ${
              bookmark.isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${bookmark.isFavorite ? 'fill-current' : ''}`} />
          </IconButton>
        </Tooltip>

        {/* Move Up / Down (Accessible Reordering) */}
        {onMoveUp && (
          <Tooltip content="Move up">
            <IconButton
              size="sm"
              variant="ghost"
              disabled={!canMoveUp}
              aria-label="Move bookmark up"
              onClick={onMoveUp}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        )}
        {onMoveDown && (
          <Tooltip content="Move down">
            <IconButton
              size="sm"
              variant="ghost"
              disabled={!canMoveDown}
              aria-label="Move bookmark down"
              onClick={onMoveDown}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        )}

        {/* Open in new tab */}
        <Tooltip content="Open in new tab">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Open in new tab"
            onClick={() => onOpen(bookmark)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>

        {/* Edit bookmark */}
        <Tooltip content="Edit bookmark">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Edit bookmark"
            onClick={() => onEdit(bookmark)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>

        {/* Move to folder */}
        <Tooltip content="Move to another folder">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Move bookmark"
            onClick={() => onMove(bookmark)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <FolderInput className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>

        {/* Create note from bookmark */}
        {onCreateNote && (
          <Tooltip content="Create note from bookmark">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Create note from bookmark"
              onClick={() => onCreateNote(bookmark)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        )}

        {/* Delete bookmark */}
        <Tooltip content="Delete bookmark">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Delete bookmark"
            onClick={() => onDelete(bookmark.id)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};
