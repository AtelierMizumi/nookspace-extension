import React from 'react';
import {
  FileText,
  Pin,
  Star,
  Inbox,
  Archive,
  Plus,
  Folder,
  Tag as TagIcon,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import { NoteCollectionEntity, NoteTagEntity, NoteEntity } from '../../../types/notes';
import { NoteViewFilter } from '../services/noteSearchService';
import { useTranslation } from '../../../services/i18n';

export interface NotesSidebarProps {
  notes: NoteEntity[];
  collections: NoteCollectionEntity[];
  tags: NoteTagEntity[];
  viewFilter: NoteViewFilter;
  selectedTag: string | null;
  onSelectView: (filter: NoteViewFilter) => void;
  onSelectTag: (tagName: string | null) => void;
  onOpenCreateCollection: () => void;
  onOpenEditCollection: (col: NoteCollectionEntity) => void;
  onOpenDeleteCollection: (col: NoteCollectionEntity) => void;
  onOpenCreateTag: () => void;
  onOpenEditTag: (tag: NoteTagEntity) => void;
  onOpenDeleteTag: (tag: NoteTagEntity) => void;
}

export function NotesSidebar({
  notes,
  collections,
  tags,
  viewFilter,
  selectedTag,
  onSelectView,
  onSelectTag,
  onOpenCreateCollection,
  onOpenEditCollection,
  onOpenDeleteCollection,
  onOpenCreateTag,
  onOpenEditTag,
  onOpenDeleteTag,
}: NotesSidebarProps) {
  const { t } = useTranslation();
  // Counts
  const activeNotes = notes.filter((n) => !n.isArchived);
  const allCount = activeNotes.length;
  const pinnedCount = activeNotes.filter((n) => n.isPinned).length;
  const favoritesCount = activeNotes.filter((n) => n.isFavorite).length;
  const uncategorizedCount = activeNotes.filter((n) => n.collectionId === null).length;
  const archivedCount = notes.filter((n) => n.isArchived).length;

  const getCollectionCount = (colId: string) =>
    activeNotes.filter((n) => n.collectionId === colId).length;

  const getTagCount = (tagName: string) =>
    activeNotes.filter((n) => n.tags.includes(tagName.toLowerCase())).length;

  const itemClass = (isActive: boolean) =>
    `flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  const countBadgeClass = (isActive: boolean) =>
    `text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
      isActive
        ? 'bg-blue-200/70 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
    }`;

  return (
    <div className="w-56 h-full flex flex-col bg-slate-50/70 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 select-none overflow-y-auto p-3 space-y-5">
      {/* 1. System Views */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            onSelectTag(null);
            onSelectView({ type: 'all' });
          }}
          className={itemClass(viewFilter.type === 'all' && selectedTag === null)}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>{t('notesManager.allNotes')}</span>
          </div>
          <span className={countBadgeClass(viewFilter.type === 'all' && selectedTag === null)}>
            {allCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTag(null);
            onSelectView({ type: 'pinned' });
          }}
          className={itemClass(viewFilter.type === 'pinned')}
        >
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-500" />
            <span>{t('notesManager.pinned')}</span>
          </div>
          <span className={countBadgeClass(viewFilter.type === 'pinned')}>
            {pinnedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTag(null);
            onSelectView({ type: 'favorites' });
          }}
          className={itemClass(viewFilter.type === 'favorites')}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{t('notesManager.favorites')}</span>
          </div>
          <span className={countBadgeClass(viewFilter.type === 'favorites')}>
            {favoritesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTag(null);
            onSelectView({ type: 'uncategorized' });
          }}
          className={itemClass(viewFilter.type === 'uncategorized')}
        >
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-400" />
            <span>{t('notesManager.uncategorized')}</span>
          </div>
          <span className={countBadgeClass(viewFilter.type === 'uncategorized')}>
            {uncategorizedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTag(null);
            onSelectView({ type: 'archived' });
          }}
          className={itemClass(viewFilter.type === 'archived')}
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-purple-500" />
            <span>{t('notesManager.archived')}</span>
          </div>
          <span className={countBadgeClass(viewFilter.type === 'archived')}>
            {archivedCount}
          </span>
        </button>
      </div>

      {/* 2. Collections Section */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>{t('notesManager.collections')}</span>
          <button
            type="button"
            onClick={onOpenCreateCollection}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title={t('notesManager.newCollection')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="px-2 py-1 text-xs text-slate-400 italic">No collections</div>
        ) : (
          collections.map((col) => {
            const isSelected =
              viewFilter.type === 'collection' && viewFilter.collectionId === col.id;
            return (
              <div
                key={col.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => {
                  onSelectTag(null);
                  onSelectView({ type: 'collection', collectionId: col.id });
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col.color || '#3b82f6' }}
                  />
                  <span className="truncate">{col.title}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className={countBadgeClass(isSelected)}>
                    {getCollectionCount(col.id)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCollection(col);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteCollection(col);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-red-500"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Tags Section */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>{t('notesManager.tags')}</span>
          <button
            type="button"
            onClick={onOpenCreateTag}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title={t('notesManager.newTag')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {tags.length === 0 ? (
          <div className="px-2 py-1 text-xs text-slate-400 italic">No tags</div>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTag === tag.name;
            return (
              <div
                key={tag.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => {
                  if (isSelected) {
                    onSelectTag(null);
                  } else {
                    onSelectTag(tag.name);
                  }
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-400 font-mono">#</span>
                  <span className="truncate">{tag.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className={countBadgeClass(isSelected)}>
                    {getTagCount(tag.name)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditTag(tag);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteTag(tag);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
