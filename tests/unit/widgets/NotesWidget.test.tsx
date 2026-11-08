import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import {
  NotesWidget,
  NotesWidgetComponent,
  NotesWidgetSettings,
} from '../../../src/widgets/NotesWidget';
import '../../../src/widgets';
import { widgetRegistry } from '../../../src/features/widget-system/WidgetRegistry';
import { WidgetRenderer } from '../../../src/features/widget-system/WidgetRenderer';
import { useNoteStore, STORAGE_KEY_NOTES_LAST_UPDATED_AT } from '../../../src/features/notes/stores/noteStore';
import { NoteEntity, NoteCollectionEntity } from '../../../src/types/notes';
import { WidgetInstanceEntity } from '../../../src/types/database';

describe('NotesWidget — Milestone 7.7 Dashboard Integration', () => {
  const ws1 = 'ws-test-1';
  const ws2 = 'ws-test-2';

  const sampleCollections: NoteCollectionEntity[] = [
    {
      id: 'col-work',
      workspaceId: ws1,
      title: 'Work Projects',
      color: '#3B82F6',
      order: 0,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'col-personal',
      workspaceId: ws1,
      title: 'Personal Ideas',
      color: '#EC4899',
      order: 1,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const sampleNotes: NoteEntity[] = [
    {
      id: 'note-1',
      workspaceId: ws1,
      collectionId: 'col-work',
      title: 'Sprint Planning',
      content: '# Sprint 42\nDiscuss backlog priorities and timeline.',
      excerpt: 'Sprint 42 Discuss backlog priorities and timeline.',
      isPinned: true,
      isFavorite: false,
      isArchived: false,
      tags: ['sprint', 'dev'],
      order: 0,
      createdAt: 100,
      updatedAt: 1000,
    },
    {
      id: 'note-2',
      workspaceId: ws1,
      collectionId: 'col-work',
      title: 'Architecture Review',
      content: '# Architecture\nEvaluating Dexie v4 indexing strategies.',
      excerpt: 'Architecture Evaluating Dexie v4 indexing strategies.',
      isPinned: false,
      isFavorite: true,
      isArchived: false,
      tags: ['arch'],
      order: 1,
      createdAt: 200,
      updatedAt: 2000,
    },
    {
      id: 'note-3',
      workspaceId: ws1,
      collectionId: 'col-personal',
      title: 'Book Recommendations',
      content: '# Books\nDesigning Data-Intensive Applications.',
      excerpt: 'Books Designing Data-Intensive Applications.',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      tags: ['reading'],
      order: 2,
      createdAt: 300,
      updatedAt: 3000,
    },
    {
      id: 'note-4',
      workspaceId: ws1,
      collectionId: null,
      title: 'Quick Scratchpad Thought',
      content: 'Fleet thought about frontend performance.',
      excerpt: 'Fleet thought about frontend performance.',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      tags: [],
      order: 3,
      createdAt: 400,
      updatedAt: 500,
    },
    {
      id: 'note-archived',
      workspaceId: ws1,
      collectionId: null,
      title: 'Old Archived Note',
      content: 'This note is archived and should not appear in active widgets.',
      excerpt: 'This note is archived and should not appear in active widgets.',
      isPinned: false,
      isFavorite: false,
      isArchived: true,
      tags: [],
      order: 4,
      createdAt: 50,
      updatedAt: 50,
    },
    {
      id: 'note-ws2',
      workspaceId: ws2,
      collectionId: null,
      title: 'Workspace 2 Note',
      content: 'Belongs strictly to workspace 2.',
      excerpt: 'Belongs strictly to workspace 2.',
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      tags: [],
      order: 0,
      createdAt: 500,
      updatedAt: 5000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useNoteStore.setState({
      notes: sampleNotes,
      collections: sampleCollections,
      tags: [],
      linkedBookmarks: [],
      selectedNoteId: null,
      activeWorkspaceId: ws1,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  describe('1. Registration & Definition', () => {
    it('is registered in widgetRegistry with correct metadata and default dimensions', () => {
      const def = widgetRegistry.get('notes');
      expect(def).toBeDefined();
      expect(def?.name).toBe('Notes & Knowledge');
      expect(def?.category).toBe('organization');
      expect(def?.defaultDimensions).toEqual({ w: 4, h: 4 });
      expect(def?.minDimensions).toEqual({ w: 3, h: 2 });
      expect(def?.maxDimensions).toEqual({ w: 12, h: 8 });
      expect(def?.defaultConfig).toEqual({
        mode: 'recent',
        collectionId: null,
        maxItems: 5,
        showExcerpts: true,
        showCollectionLabel: true,
        density: 'comfortable',
        showQuickCreate: true,
      });
    });

    it('renders via WidgetRenderer in dashboard view mode and edit mode', () => {
      const instance: WidgetInstanceEntity = {
        id: 'inst-notes-1',
        workspaceId: ws1,
        widgetType: 'notes',
        title: 'Notes & Knowledge',
        config: { mode: 'recent' },
        isEnabled: true,
        order: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const { container, rerender } = render(
        <WidgetRenderer
          instance={instance}
          isEditMode={false}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Notes & Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Book Recommendations')).toBeInTheDocument();

      // Edit Mode should display edit overlay
      rerender(
        <WidgetRenderer
          instance={instance}
          isEditMode={true}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(container.querySelector('.widget-drag-handle')).toBeInTheDocument();
    });
  });

  describe('2. Display Modes & Filtering', () => {
    it('Recent mode: renders non-archived notes ordered by updatedAt desc', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'recent' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      // note-3 (3000), note-2 (2000), note-1 (1000), note-4 (500)
      const noteTitles = screen
        .getAllByRole('listitem')
        .map((el) => el.querySelector('span.text-xs')?.textContent);

      expect(noteTitles).toEqual([
        'Book Recommendations',
        'Architecture Review',
        'Sprint Planning',
        'Quick Scratchpad Thought',
      ]);

      // Archived and foreign workspace notes must never appear
      expect(screen.queryByText('Old Archived Note')).not.toBeInTheDocument();
      expect(screen.queryByText('Workspace 2 Note')).not.toBeInTheDocument();
    });

    it('Pinned mode: renders only pinned notes', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'pinned' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
      expect(screen.getByText('Book Recommendations')).toBeInTheDocument();
      expect(screen.queryByText('Architecture Review')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Scratchpad Thought')).not.toBeInTheDocument();
    });

    it('Favorites mode: renders only favorite notes', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'favorites' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
      expect(screen.getByText('Book Recommendations')).toBeInTheDocument();
      expect(screen.queryByText('Sprint Planning')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Scratchpad Thought')).not.toBeInTheDocument();
    });

    it('Collection mode: renders notes belonging to the selected collection', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'collection', collectionId: 'col-work' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
      expect(screen.queryByText('Book Recommendations')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Scratchpad Thought')).not.toBeInTheDocument();
    });

    it('Collection mode with null collectionId: renders Uncategorized notes', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'collection', collectionId: null }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Quick Scratchpad Thought')).toBeInTheDocument();
      expect(screen.queryByText('Sprint Planning')).not.toBeInTheDocument();
      expect(screen.queryByText('Book Recommendations')).not.toBeInTheDocument();
    });

    it('respects maxItems display limit', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'recent', maxItems: 2 }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(screen.getByText('Book Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
      expect(screen.queryByText('Sprint Planning')).not.toBeInTheDocument();
    });
  });

  describe('3. Display Options & Density', () => {
    it('shows or hides excerpts based on showExcerpts config', () => {
      const { rerender } = render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ showExcerpts: true }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(
        screen.getByText(/Designing Data-Intensive Applications/)
      ).toBeInTheDocument();

      rerender(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ showExcerpts: false }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(
        screen.queryByText(/Designing Data-Intensive Applications/)
      ).not.toBeInTheDocument();
    });

    it('shows collection badges when showCollectionLabel is true', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ showCollectionLabel: true }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Personal Ideas')).toBeInTheDocument();
    });

    it('applies compact density styles when density is "compact"', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ density: 'compact' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const items = screen.getAllByRole('listitem');
      expect(items[0].querySelector('button')!.className).toContain('p-1.5');
    });
  });

  describe('4. User Interactions & Navigation', () => {
    it('clicking a note dispatches "nookspace:open-notes-manager" with noteId', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'recent' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const noteButton = screen.getByText('Book Recommendations').closest('button')!;
      fireEvent.click(noteButton);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nookspace:open-notes-manager',
          detail: { noteId: 'note-3' },
        })
      );

      dispatchSpy.mockRestore();
    });

    it('clicking "Open Notes Manager" in header opens the manager', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'recent' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const openManagerBtn = screen.getByLabelText('Open Notes Manager');
      fireEvent.click(openManagerBtn);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nookspace:open-notes-manager',
        })
      );

      dispatchSpy.mockRestore();
    });

    it('quick-create action creates note in active workspace and opens manager', async () => {
      const createdNote: NoteEntity = {
        id: 'new-note-42',
        workspaceId: ws1,
        collectionId: 'col-work',
        title: 'Untitled Note',
        content: '',
        excerpt: '',
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        tags: [],
        order: 5,
        createdAt: 6000,
        updatedAt: 6000,
      };

      const createNoteMock = vi.fn().mockResolvedValue(createdNote);
      useNoteStore.setState({ createNote: createNoteMock });
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'collection', collectionId: 'col-work' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const createBtn = screen.getByLabelText('Create Note');
      await act(async () => {
        fireEvent.click(createBtn);
      });

      expect(createNoteMock).toHaveBeenCalledWith({
        title: 'Untitled Note',
        content: '',
        collectionId: 'col-work',
        workspaceId: ws1,
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nookspace:open-notes-manager',
          detail: { noteId: 'new-note-42' },
        })
      );

      dispatchSpy.mockRestore();
    });
  });

  describe('5. Empty, Loading & Error States', () => {
    it('renders loading skeleton when isLoading is true and notes is empty', () => {
      useNoteStore.setState({ notes: [], isLoading: true });

      const { container } = render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{}}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('renders error state with retry button when error is set', () => {
      const loadNotesMock = vi.fn();
      useNoteStore.setState({
        notes: [],
        isLoading: false,
        error: 'Failed to access IndexedDB database',
        loadNotes: loadNotesMock,
      });

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{}}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Failed to access IndexedDB database')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryBtn);
      expect(loadNotesMock).toHaveBeenCalledWith(ws1);
    });

    it('renders empty state for Pinned mode when no notes are pinned', () => {
      useNoteStore.setState({
        notes: sampleNotes.map((n) => ({ ...n, isPinned: false })),
      });

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'pinned' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('No pinned notes')).toBeInTheDocument();
    });

    it('renders empty state for Favorites mode when no notes are favorited', () => {
      useNoteStore.setState({
        notes: sampleNotes.map((n) => ({ ...n, isFavorite: false })),
      });

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'favorites' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('No favorite notes')).toBeInTheDocument();
    });

    it('renders empty state for Collection mode when collection has no notes', () => {
      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{ mode: 'collection', collectionId: 'non-existent' }}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('No uncategorized notes')).toBeInTheDocument();
    });
  });

  describe('6. Workspace Isolation & Storage Sync', () => {
    it('isolates notes by workspace ID and re-initializes on workspace change', () => {
      const initializeMock = vi.fn();
      useNoteStore.setState({ initialize: initializeMock, activeWorkspaceId: ws1 });

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws2}
          isEditMode={false}
          config={{}}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(initializeMock).toHaveBeenCalledWith(ws2);
    });

    it('attaches storage listener and reloads notes on cross-tab update event', () => {
      let listener: any = null;
      const fakeChrome = {
        storage: {
          onChanged: {
            addListener: vi.fn((fn) => {
              listener = fn;
            }),
            removeListener: vi.fn(),
          },
        },
      };
      (globalThis as any).chrome = fakeChrome;

      const loadNotesMock = vi.fn();
      const loadCollectionsMock = vi.fn();
      useNoteStore.setState({
        loadNotes: loadNotesMock,
        loadCollections: loadCollectionsMock,
      });

      render(
        <NotesWidgetComponent
          instanceId="inst-1"
          workspaceId={ws1}
          isEditMode={false}
          config={{}}
          onUpdateConfig={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(fakeChrome.storage.onChanged.addListener).toHaveBeenCalled();

      // Simulate cross-tab event
      act(() => {
        listener({ [STORAGE_KEY_NOTES_LAST_UPDATED_AT]: { newValue: Date.now() } }, 'local');
      });

      expect(loadNotesMock).toHaveBeenCalledWith(ws1);
      expect(loadCollectionsMock).toHaveBeenCalledWith(ws1);

      delete (globalThis as any).chrome;
    });
  });

  describe('7. NotesWidgetSettings Component', () => {
    it('renders configuration controls and saves updated settings', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <NotesWidgetSettings
          config={{ mode: 'recent', maxItems: 5 }}
          onSaveConfig={handleSave}
          onClose={handleClose}
        />
      );

      expect(screen.getByText('Display Mode')).toBeInTheDocument();
      expect(screen.getByText('Maximum Displayed Notes')).toBeInTheDocument();

      // Change mode to pinned
      const modeSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(modeSelect, { target: { value: 'pinned' } });

      // Click save
      const saveBtn = screen.getByRole('button', { name: 'Save Settings' });
      fireEvent.click(saveBtn);

      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'pinned',
          collectionId: null,
          maxItems: 5,
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });

    it('displays collection selector when mode is "collection"', () => {
      render(
        <NotesWidgetSettings
          config={{ mode: 'collection', collectionId: 'col-work' }}
          onSaveConfig={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Select Collection')).toBeInTheDocument();
      expect(screen.getByText('📁 Work Projects')).toBeInTheDocument();
      expect(screen.getByText('📁 Personal Ideas')).toBeInTheDocument();
    });
  });
});
