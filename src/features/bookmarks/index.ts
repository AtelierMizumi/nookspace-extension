// Smart Bookmarks Feature Exports
import { useBookmarkStore } from './stores/bookmarkStore';

export * from './components/BookmarkManagerModal';
export * from './components/FolderSidebar';
export * from './components/BookmarkList';
export * from './components/BookmarkItem';
export * from './components/BookmarkDialogs';
export * from './components/BookmarkImportExportDialog';

export * from './stores/bookmarkStore';
export * from './repositories/bookmarkRepository';
export * from './repositories/bookmarkGroupRepository';
export * from './services/bookmarkSearchService';
export * from './services/bookmarkHtmlExportService';
export * from './services/bookmarkHtmlImportService';
export * from './services/bookmarkJsonExportService';
export * from './services/bookmarkJsonImportService';
export * from './services/bookmarkImportCoordinator';
export * from './types/bookmarkImportExport';
export * from './utils/bookmarkSecurity';
export * from './utils/bookmarkHtmlParser';
export * from './utils/bookmarkExportUtils';

export const EVENT_OPEN_BOOKMARK_MANAGER = 'nookspace:open-bookmark-manager';

export function openBookmarkManager(options?: {
  groupId?: string | null;
  favoritesOnly?: boolean;
}): void {
  if (options?.favoritesOnly) {
    useBookmarkStore.getState().setShowFavoritesOnly(true);
    useBookmarkStore.getState().selectAllGroups();
  } else if (options?.groupId !== undefined) {
    useBookmarkStore.getState().setShowFavoritesOnly(false);
    if (options.groupId === null) {
      useBookmarkStore.getState().selectUncategorized();
    } else {
      useBookmarkStore.getState().selectGroup(options.groupId);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_OPEN_BOOKMARK_MANAGER, { detail: options })
    );
  }
}

