import React from 'react';
import { cn } from '../../../utils/cn';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../types/bookmarks';
import { BookmarkGroupFilter } from '../services/bookmarkSearchService';
import { Button, IconButton } from '../../../components/ui/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useTranslation } from '../../../services/i18n';
import {
  Bookmark,
  Star,
  Inbox,
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export interface FolderSidebarProps {
  groups: BookmarkGroupEntity[];
  bookmarks: BookmarkEntity[];
  groupFilter: BookmarkGroupFilter;
  showFavoritesOnly: boolean;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectUncategorized: () => void;
  onSelectGroup: (groupId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (group: BookmarkGroupEntity) => void;
  onDeleteFolder: (group: BookmarkGroupEntity) => void;
  onReorderGroups?: (groupIds: string[]) => void;
  className?: string;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
  groups,
  bookmarks,
  groupFilter,
  showFavoritesOnly,
  onSelectAll,
  onSelectFavorites,
  onSelectUncategorized,
  onSelectGroup,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onReorderGroups,
  className,
}) => {
  const { t } = useTranslation();
  const totalCount = bookmarks.length;
  const favoritesCount = bookmarks.filter((b) => b.isFavorite).length;
  const uncategorizedCount = bookmarks.filter((b) => b.groupId === null).length;

  const isAllSelected = groupFilter.type === 'all' && !showFavoritesOnly;
  const isFavoritesSelected = showFavoritesOnly;
  const isUncategorizedSelected = groupFilter.type === 'uncategorized' && !showFavoritesOnly;

  const handleMoveGroupUp = (index: number) => {
    if (!onReorderGroups || index <= 0) return;
    const newGroups = [...groups];
    const temp = newGroups[index - 1];
    newGroups[index - 1] = newGroups[index];
    newGroups[index] = temp;
    onReorderGroups(newGroups.map((g) => g.id));
  };

  const handleMoveGroupDown = (index: number) => {
    if (!onReorderGroups || index >= groups.length - 1) return;
    const newGroups = [...groups];
    const temp = newGroups[index + 1];
    newGroups[index + 1] = newGroups[index];
    newGroups[index] = temp;
    onReorderGroups(newGroups.map((g) => g.id));
  };

  return (
    <aside
      className={cn(
        'w-60 shrink-0 flex flex-col border-r border-border/50 bg-card/60 p-3 select-none',
        className
      )}
    >
      {/* System views */}
      <div className="space-y-1">
        {/* All Bookmarks */}
        <button
          type="button"
          onClick={onSelectAll}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
            isAllSelected
              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
              : 'text-foreground hover:bg-secondary/70'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Bookmark className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('bookmarks.allBookmarks')}</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isAllSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Favorites */}
        <button
          type="button"
          onClick={onSelectFavorites}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
            isFavoritesSelected
              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
              : 'text-foreground hover:bg-secondary/70'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Star className={`h-3.5 w-3.5 shrink-0 ${isFavoritesSelected ? 'fill-current' : 'text-amber-400'}`} />
            <span className="truncate">{t('bookmarks.favorites')}</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isFavoritesSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {favoritesCount}
          </span>
        </button>

        {/* Uncategorized */}
        <button
          type="button"
          onClick={onSelectUncategorized}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
            isUncategorizedSelected
              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
              : 'text-foreground hover:bg-secondary/70'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('bookmarks.uncategorized')}</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              isUncategorizedSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {uncategorizedCount}
          </span>
        </button>
      </div>

      <div className="my-3 border-t border-border/40" />

      {/* Folders Section Header */}
      <div className="flex items-center justify-between px-2 mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t('bookmarks.folders')}
        </span>
        <Tooltip content={t('bookmarks.newFolder')}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Add folder"
            onClick={onCreateFolder}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
      </div>

      {/* User Folders List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
        {groups.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-[11px] text-muted-foreground">No folders yet</p>
            <button
              type="button"
              onClick={onCreateFolder}
              className="text-[11px] text-primary hover:underline font-medium mt-1 inline-block"
            >
              + Create folder
            </button>
          </div>
        ) : (
          groups.map((group, index) => {
            const isSelected =
              groupFilter.type === 'group' &&
              groupFilter.groupId === group.id &&
              !showFavoritesOnly;

            const groupCount = bookmarks.filter((b) => b.groupId === group.id).length;

            return (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                    : 'text-foreground hover:bg-secondary/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                  className="flex items-center gap-2 truncate flex-1 text-left focus:outline-none"
                  title={group.title}
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || '#3B82F6' }}
                  />
                  <span className="truncate">{group.title}</span>
                </button>

                {/* Right controls: count or action buttons on hover */}
                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                  {/* Action buttons (revealed on group hover or keyboard focus) */}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    {onReorderGroups && (
                      <>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          disabled={index === 0}
                          aria-label={`Move ${group.title} up`}
                          onClick={() => handleMoveGroupUp(index)}
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20 p-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </IconButton>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          disabled={index === groups.length - 1}
                          aria-label={`Move ${group.title} down`}
                          onClick={() => handleMoveGroupDown(index)}
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20 p-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </IconButton>
                      </>
                    )}

                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Rename ${group.title}`}
                      onClick={() => onRenameFolder(group)}
                      className="h-5 w-5 text-muted-foreground hover:text-foreground p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </IconButton>

                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${group.title}`}
                      onClick={() => onDeleteFolder(group)}
                      className="h-5 w-5 text-muted-foreground hover:text-destructive p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  </div>

                  {/* Bookmark Count badge */}
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground group-hover:hidden">
                    {groupCount}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="pt-2 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFolder}
          leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
          className="w-full text-xs justify-start h-8"
        >
          New Folder
        </Button>
      </div>
    </aside>
  );
};
