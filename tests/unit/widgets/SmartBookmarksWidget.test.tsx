import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import {
  SmartBookmarksWidget,
  SmartBookmarksWidgetComponent,
  SmartBookmarksWidgetSettings,
} from '../../../src/widgets/SmartBookmarksWidget';
import '../../../src/widgets';
import { widgetRegistry } from '../../../src/features/widget-system/WidgetRegistry';
import { WidgetRenderer } from '../../../src/features/widget-system/WidgetRenderer';
import { useBookmarkStore } from '../../../src/features/bookmarks/stores/bookmarkStore';
import { STORAGE_KEY_BOOKMARKS_LAST_UPDATED_AT } from '../../../src/features/bookmarks/stores/bookmarkStore';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';
import { WidgetInstanceEntity } from '../../../src/types/database';

describe('SmartBookmarksWidget — Milestone 6.6 Dashboard Integration', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-dev',
      workspaceId: 'ws-1',
      title: 'Development',
      color: '#3B82F6',
      icon: 'code',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'grp-design',
      workspaceId: 'ws-1',
      title: 'Design',
      color: '#EC4899',
      icon: 'palette',
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub',
      url: 'https://github.com',
      description: 'Code repository',
      isFavorite: true,
      order: 0,
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: 'bm-2',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitLab',
      url: 'https://gitlab.com',
      description: 'DevOps platform',
      isFavorite: false,
      order: 1,
      createdAt: 150,
      updatedAt: 150,
    },
    {
      id: 'bm-3',
      workspaceId: 'ws-1',
      groupId: 'grp-design',
      title: 'Figma',
      url: 'https://figma.com',
      description: 'Design tool',
      isFavorite: true,
      order: 2,
      createdAt: 200,
      updatedAt: 200,
    },
    {
      id: 'bm-4',
      workspaceId: 'ws-1',
      groupId: null,
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      description: 'Web documentation',
      isFavorite: false,
      order: 3,
      createdAt: 300,
      updatedAt: 300,
    },
    {
      id: 'bm-unsafe',
      workspaceId: 'ws-1',
      groupId: null,
      title: 'Malicious Link',
      url: 'javascript:alert(1)',
      description: 'XSS attempt',
      isFavorite: false,
      order: 4,
      createdAt: 400,
      updatedAt: 400,
    },
  ];

  const foreignWorkspaceBookmark: BookmarkEntity = {
    id: 'bm-foreign',
    workspaceId: 'ws-2',
    groupId: null,
    title: 'Foreign Workspace Item',
    url: 'https://foreign.com',
    isFavorite: false,
    order: 0,
    createdAt: 500,
    updatedAt: 500,
  };

  let mockInitialize: ReturnType<typeof vi.fn>;
  let mockLoadBookmarks: ReturnType<typeof vi.fn>;
  let mockLoadGroups: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInitialize = vi.fn().mockResolvedValue(undefined);
    mockLoadBookmarks = vi.fn().mockResolvedValue(undefined);
    mockLoadGroups = vi.fn().mockResolvedValue(undefined);

    useBookmarkStore.setState({
      bookmarks: [...sampleBookmarks, foreignWorkspaceBookmark],
      groups: [...sampleGroups],
      activeWorkspaceId: 'ws-1',
      isLoading: false,
      isInitialized: true,
      error: null,
      initialize: mockInitialize,
      loadBookmarks: mockLoadBookmarks,
      loadGroups: mockLoadGroups,
    });
  });

  // ==========================================
  // 1. WIDGET REGISTRATION & DEFINITION
  // ==========================================
  describe('Registration & Definition', () => {
    it('1. verifies Smart Bookmarks widget is registered in widgetRegistry', () => {
      expect(widgetRegistry.has('smart-bookmarks')).toBe(true);

      const def = widgetRegistry.get('smart-bookmarks');
      expect(def).toBeDefined();
      expect(def?.name).toBe('Smart Bookmarks');
      expect(def?.category).toBe('productivity');
      expect(def?.defaultDimensions).toEqual({ w: 4, h: 3 });
      expect(def?.minDimensions).toEqual({ w: 3, h: 2 });
    });

    it('2. renders via WidgetRenderer in dashboard view mode and edit mode', () => {
      const instance: WidgetInstanceEntity = {
        id: 'inst-sb-1',
        workspaceId: 'ws-1',
        widgetType: 'smart-bookmarks',
        title: 'Smart Bookmarks',
        config: { source: 'all', maxItems: 8 },
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const { rerender } = render(
        <WidgetRenderer
          instance={instance}
          isEditMode={false}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Verify widget header and tiles render
      expect(screen.getByText('Smart Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();

      // Rerender in edit mode
      rerender(
        <WidgetRenderer
          instance={instance}
          isEditMode={true}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // In edit mode, settings button should be rendered
      expect(screen.getByRole('button', { name: 'Widget Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Widget' })).toBeInTheDocument();
    });
  });

  // ==========================================
  // 2. BOOKMARK DISPLAY & FILTERING
  // ==========================================
  describe('Display & Filtering', () => {
    it('3. displays bookmarks from All Bookmarks and respects maxItems limit', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all', maxItems: 3, showDomain: true }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Only first 3 bookmarks in ws-1 should be shown
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('GitLab')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.queryByText('MDN Web Docs')).not.toBeInTheDocument();

      // Domains are shown
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.getByText('gitlab.com')).toBeInTheDocument();
      expect(screen.getByText('figma.com')).toBeInTheDocument();
    });

    it('4. displays only favorites when configured for Favorites', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'favorites', maxItems: 8 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // GitHub and Figma are favorites in ws-1
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();

      // GitLab and MDN are not favorites
      expect(screen.queryByText('GitLab')).not.toBeInTheDocument();
      expect(screen.queryByText('MDN Web Docs')).not.toBeInTheDocument();

      // Header shows Favorites badge
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('5. displays only Uncategorized bookmarks when configured', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'uncategorized', maxItems: 8 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // MDN Web Docs has groupId null
      expect(screen.getByText('MDN Web Docs')).toBeInTheDocument();

      // Items in folders are excluded
      expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
    });

    it('6. displays bookmarks from a specific folder', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'folder', folderId: 'grp-dev', maxItems: 8 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Development folder contains GitHub and GitLab
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('GitLab')).toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
      expect(screen.queryByText('MDN Web Docs')).not.toBeInTheDocument();

      // Header displays folder badge
      expect(screen.getByText('Development')).toBeInTheDocument();
    });

    it('7. recovers gracefully when configured folder no longer exists (falls back to all)', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'folder', folderId: 'non-existent-group', maxItems: 8 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Falls back to all bookmarks and shows warning badge
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Folder Removed')).toBeInTheDocument();
    });

    it('8. enforces strict workspace isolation: never displays foreign workspace bookmarks', () => {
      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all', maxItems: 10 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Foreign workspace bookmark must NOT be displayed
      expect(screen.queryByText('Foreign Workspace Item')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // 3. INTERACTIONS & NAVIGATION SAFETY
  // ==========================================
  describe('Interactions & Safety', () => {
    it('9. opens safe URLs in a new tab with noopener,noreferrer', () => {
      const originalOpen = window.open;
      window.open = vi.fn();

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Click GitHub tile
      const githubTile = screen.getByText('GitHub').closest('button');
      expect(githubTile).not.toBeNull();
      fireEvent.click(githubTile!);

      expect(window.open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer');

      window.open = originalOpen;
    });

    it('10. prevents unsafe URLs (javascript:) from executing or opening', () => {
      const originalOpen = window.open;
      window.open = vi.fn();

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all', maxItems: 10 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // Click Malicious Link tile
      const unsafeTile = screen.getByText('Malicious Link').closest('button');
      expect(unsafeTile).not.toBeNull();
      fireEvent.click(unsafeTile!);

      // window.open must NOT have been called with javascript: scheme
      expect(window.open).not.toHaveBeenCalled();

      window.open = originalOpen;
    });

    it('11. dispatches open bookmark manager event when clicking manager icon', () => {
      const eventHandler = vi.fn();
      window.addEventListener('nookspace:open-bookmark-manager', eventHandler);

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'folder', folderId: 'grp-dev' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const managerBtn = screen.getByRole('button', { name: 'Open Bookmark Manager' });
      fireEvent.click(managerBtn);

      expect(eventHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('nookspace:open-bookmark-manager', eventHandler);
    });

    it('12. opens in-widget settings modal and saves new configuration', async () => {
      const handleUpdateConfig = vi.fn();

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all', maxItems: 8, showDomain: true }}
          onUpdateConfig={handleUpdateConfig}
          onRemove={vi.fn()}
        />
      );

      // Click Settings icon
      fireEvent.click(screen.getByRole('button', { name: 'Smart Bookmarks Settings' }));

      // Settings modal opens
      expect(screen.getByText('Smart Bookmarks Settings')).toBeInTheDocument();

      // Change source to Favorites
      const sourceSelect = screen.getByLabelText(/display bookmarks from/i);
      fireEvent.change(sourceSelect, { target: { value: 'favorites' } });

      // Change max items to 4
      const maxSelect = screen.getByLabelText(/maximum visible bookmarks/i);
      fireEvent.change(maxSelect, { target: { value: '4' } });

      // Click Save Settings
      fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

      expect(handleUpdateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'favorites',
          folderId: null,
          maxItems: 4,
        })
      );
    });
  });

  // ==========================================
  // 4. EMPTY, LOADING & ERROR STATES
  // ==========================================
  describe('Empty, Loading and Error States', () => {
    it('13. renders empty state when workspace has zero bookmarks', () => {
      useBookmarkStore.setState({
        bookmarks: [],
        groups: [],
        isLoading: false,
        error: null,
      });

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add bookmark/i })).toBeInTheDocument();
    });

    it('14. renders empty state when configured for Favorites but no favorites exist', () => {
      useBookmarkStore.setState({
        bookmarks: [sampleBookmarks[1]], // GitLab is not favorite
        groups: sampleGroups,
        isLoading: false,
        error: null,
      });

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'favorites' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('No favorites yet')).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: /open bookmark manager/i }).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('15. renders empty state when configured folder has no bookmarks', () => {
      useBookmarkStore.setState({
        bookmarks: [sampleBookmarks[0]], // Only grp-dev has bookmarks
        groups: sampleGroups,
        isLoading: false,
        error: null,
      });

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'folder', folderId: 'grp-design' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Folder "Design" is empty')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /manage folder/i })).toBeInTheDocument();
    });

    it('16. renders error state and retries on click', () => {
      useBookmarkStore.setState({
        bookmarks: [],
        groups: [],
        isLoading: false,
        error: 'Failed to access database storage',
      });

      render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Failed to access database storage')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(mockLoadBookmarks).toHaveBeenCalledWith('ws-1');
    });
  });

  // ==========================================
  // 5. LIVE SYNCHRONIZATION
  // ==========================================
  describe('Live Synchronization', () => {
    it('17. reactively updates visible tiles when bookmark store state changes', () => {
      const { rerender } = render(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('GitHub')).toBeInTheDocument();

      // Simulate bookmark deletion in store
      act(() => {
        useBookmarkStore.setState({
          bookmarks: sampleBookmarks.filter((b) => b.id !== 'bm-1'),
        });
      });

      rerender(
        <SmartBookmarksWidgetComponent
          instanceId="inst-1"
          workspaceId="ws-1"
          isEditMode={false}
          config={{ source: 'all' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    });
  });
});
