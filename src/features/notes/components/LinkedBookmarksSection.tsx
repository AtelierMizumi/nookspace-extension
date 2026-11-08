import React, { useState } from 'react';
import { Bookmark, Globe, Plus, X, ExternalLink } from 'lucide-react';
import { BookmarkEntity } from '../../../types/bookmarks';
import { extractDomain } from '../../bookmarks/services/bookmarkSearchService';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';
import { Tooltip } from '../../../components/ui/Tooltip';
import { IconButton } from '../../../components/ui/Button';

export interface LinkedBookmarksSectionProps {
  linkedBookmarks: BookmarkEntity[];
  onOpenLinkModal: () => void;
  onUnlink: (bookmarkId: string) => Promise<void>;
}

export const LinkedBookmarksSection: React.FC<LinkedBookmarksSectionProps> = ({
  linkedBookmarks,
  onOpenLinkModal,
  onUnlink,
}) => {
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleOpenBookmark = (url: string) => {
    if (isSafeBookmarkUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUnlinkClick = async (e: React.MouseEvent, bmId: string) => {
    e.stopPropagation();
    if (unlinkingId) return;

    setUnlinkingId(bmId);
    try {
      await onUnlink(bmId);
    } catch (err) {
      console.error('Failed to unlink bookmark:', err);
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20 text-xs">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Bookmark className="w-3.5 h-3.5 text-blue-500" />
          <span>Linked Bookmarks</span>
          {linkedBookmarks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold">
              {linkedBookmarks.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenLinkModal}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          title="Link a bookmark to this note"
        >
          <Plus className="w-3 h-3" />
          <span>Link Bookmark</span>
        </button>
      </div>

      {linkedBookmarks.length === 0 ? (
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 py-0.5">
          <span>No bookmarks attached to this note.</span>
          <button
            type="button"
            onClick={onOpenLinkModal}
            className="text-slate-500 hover:text-blue-500 hover:underline"
          >
            Attach related resources
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
          {linkedBookmarks.map((bm) => {
            const domain = extractDomain(bm.url) || bm.url;
            return (
              <div
                key={bm.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenBookmark(bm.url)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenBookmark(bm.url);
                }}
                title={`${bm.title}\n${bm.url}\nClick to open in new tab`}
                className="group flex items-center gap-2 p-1.5 pl-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:shadow-xs transition-all cursor-pointer text-left select-none max-w-xs"
              >
                {/* Favicon */}
                <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                    alt=""
                    className="h-3.5 w-3.5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Globe className="h-3 w-3 text-slate-400 -ml-3.5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {bm.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{domain}</div>
                </div>

                {/* External indicator icon on hover */}
                <ExternalLink className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 shrink-0" />

                {/* Unlink Button */}
                <Tooltip content="Unlink bookmark" position="top">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Unlink bookmark"
                    disabled={unlinkingId === bm.id}
                    onClick={(e) => handleUnlinkClick(e, bm.id)}
                    className="h-5 w-5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0 p-0"
                  >
                    <X className="w-3 h-3" />
                  </IconButton>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
