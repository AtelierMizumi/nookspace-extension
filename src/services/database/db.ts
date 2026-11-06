import Dexie, { Table } from 'dexie';
import {
  WorkspaceEntity,
  LayoutPresetEntity,
  WidgetLayoutEntity,
  WidgetInstanceEntity,
  TodoEntity,
  NoteEntity,
  StickyNoteEntity,
  BookmarkGroupEntity,
  BookmarkEntity,
  VocabularyEntity,
  ResourceEntity,
  FocusSessionEntity,
  DailyGoalEntity,
  CalendarEventEntity,
  AppSettingsEntity,
} from '../../types/database';

export class NookSpaceDB extends Dexie {
  workspaces!: Table<WorkspaceEntity, string>;
  layouts!: Table<LayoutPresetEntity, string>;
  widgetLayouts!: Table<WidgetLayoutEntity, string>;
  widgetInstances!: Table<WidgetInstanceEntity, string>;
  todos!: Table<TodoEntity, string>;
  notes!: Table<NoteEntity, string>;
  stickyNotes!: Table<StickyNoteEntity, string>;
  bookmarkGroups!: Table<BookmarkGroupEntity, string>;
  bookmarks!: Table<BookmarkEntity, string>;
  vocabulary!: Table<VocabularyEntity, string>;
  resources!: Table<ResourceEntity, string>;
  focusSessions!: Table<FocusSessionEntity, string>;
  dailyGoals!: Table<DailyGoalEntity, string>;
  calendarEvents!: Table<CalendarEventEntity, string>;
  settings!: Table<AppSettingsEntity, string>;

  constructor() {
    super('NookSpaceDB');

    // Version 1 Schema
    this.version(1).stores({
      workspaces: 'id, isDefault, order',
      layouts: 'id, workspaceId, isDefault',
      widgetInstances: 'id, workspaceId, widgetType, isEnabled, order',
      todos: 'id, workspaceId, completed, priority, dueDate, category, order',
      notes: 'id, workspaceId, isPinned, *tags, updatedAt',
      stickyNotes: 'id, workspaceId',
      bookmarkGroups: 'id, workspaceId, order',
      bookmarks: 'id, groupId, isFavorite, order',
      vocabulary: 'id, workspaceId, category, status',
      resources: 'id, workspaceId, category, *tags, isPinned',
      focusSessions: 'id, workspaceId, type, startedAt, completedAt',
      dailyGoals: 'id, workspaceId, dateString',
      calendarEvents: 'id, workspaceId, startDate, endDate',
      settings: 'id',
    });

    // Version 2 Schema: Granular Breakpoint-based Widget Layout Architecture
    this.version(2)
      .stores({
        widgetLayouts: 'id, [workspaceId+breakpoint], workspaceId, widgetInstanceId, breakpoint',
      })
      .upgrade(async (tx) => {
        try {
          const oldLayoutsTable = tx.table('layouts');
          const count = await oldLayoutsTable.count();
          if (count > 0) {
            const oldLayouts = await oldLayoutsTable.toArray();
            const newRecords: WidgetLayoutEntity[] = [];
            const now = Date.now();

            for (const layout of oldLayouts) {
              if (layout.items && Array.isArray(layout.items)) {
                for (const item of layout.items) {
                  if (item.widgetInstanceId) {
                    newRecords.push({
                      id: `${layout.workspaceId}_${item.widgetInstanceId}_lg`,
                      workspaceId: layout.workspaceId,
                      widgetInstanceId: item.widgetInstanceId,
                      breakpoint: 'lg',
                      x: item.x ?? 0,
                      y: item.y ?? 0,
                      w: item.w ?? 4,
                      h: item.h ?? 3,
                      minW: item.minW,
                      minH: item.minH,
                      maxW: item.maxW,
                      maxH: item.maxH,
                      isDefault: Boolean(layout.isDefault),
                      createdAt: layout.createdAt || now,
                      updatedAt: layout.updatedAt || now,
                    });
                  }
                }
              }
            }

            if (newRecords.length > 0) {
              await tx.table('widgetLayouts').bulkPut(newRecords);
            }
          }
        } catch (err) {
          console.warn('[NookSpaceDB] Migration v1 -> v2 warning:', err);
        }
      });
  }

  async seedInitialData(): Promise<void> {
    const count = await this.workspaces.count();
    if (count > 0) return;

    const now = Date.now();
    const defaultWorkspaces: WorkspaceEntity[] = [
      {
        id: 'ws-default-personal',
        name: 'Personal Space',
        icon: 'Sparkles',
        color: '#6366f1',
        isDefault: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-study',
        name: 'Study & Deep Work',
        icon: 'GraduationCap',
        color: '#10b981',
        isDefault: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-dev',
        name: 'Developer Studio',
        icon: 'Code',
        color: '#8b5cf6',
        isDefault: false,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const initialWidgets: WidgetInstanceEntity[] = [
      {
        id: 'widget-clock-default',
        workspaceId: 'ws-default-personal',
        widgetType: 'clock',
        title: 'Time & Greeting',
        config: { showSeconds: true, format24h: false },
        isEnabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'widget-links-default',
        workspaceId: 'ws-default-personal',
        widgetType: 'quick-links',
        title: 'Pinned Shortcuts',
        config: {
          links: [
            { id: '1', title: 'GitHub', url: 'https://github.com' },
            { id: '2', title: 'Notion', url: 'https://notion.so' },
            { id: '3', title: 'YouTube', url: 'https://youtube.com' },
          ],
        },
        isEnabled: true,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'widget-todo-default',
        workspaceId: 'ws-default-personal',
        widgetType: 'simple-todo',
        title: 'Daily Tasks',
        config: {
          tasks: [
            { id: '1', title: 'Plan daily focus sessions', completed: true },
            { id: '2', title: 'Review vocabulary notes', completed: false },
          ],
        },
        isEnabled: true,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'widget-notes-default',
        workspaceId: 'ws-default-personal',
        widgetType: 'quick-notes',
        title: 'Scratchpad',
        config: {
          content: '💡 NookSpace Phase 2: Widget System active.\nCustomize your workspace with modular widgets.',
        },
        isEnabled: true,
        order: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'widget-cal-default',
        workspaceId: 'ws-default-personal',
        widgetType: 'calendar-overview',
        title: 'Calendar & Date',
        config: {},
        isEnabled: true,
        order: 4,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const initialLayouts: WidgetLayoutEntity[] = [
      {
        id: 'ws-default-personal_widget-clock-default_lg',
        workspaceId: 'ws-default-personal',
        widgetInstanceId: 'widget-clock-default',
        breakpoint: 'lg',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-default-personal_widget-links-default_lg',
        workspaceId: 'ws-default-personal',
        widgetInstanceId: 'widget-links-default',
        breakpoint: 'lg',
        x: 4,
        y: 0,
        w: 4,
        h: 3,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-default-personal_widget-todo-default_lg',
        workspaceId: 'ws-default-personal',
        widgetInstanceId: 'widget-todo-default',
        breakpoint: 'lg',
        x: 8,
        y: 0,
        w: 4,
        h: 3,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-default-personal_widget-notes-default_lg',
        workspaceId: 'ws-default-personal',
        widgetInstanceId: 'widget-notes-default',
        breakpoint: 'lg',
        x: 0,
        y: 2,
        w: 4,
        h: 3,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ws-default-personal_widget-cal-default_lg',
        workspaceId: 'ws-default-personal',
        widgetInstanceId: 'widget-cal-default',
        breakpoint: 'lg',
        x: 4,
        y: 3,
        w: 4,
        h: 3,
        minW: 3,
        minH: 2,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const defaultSettings: AppSettingsEntity = {
      id: 'current_settings',
      theme: 'dark',
      accentColor: '#6366f1',
      fontFamily: 'Inter',
      fontSize: 'md',
      backgroundType: 'color',
      backgroundValue: '#09090b',
      widgetOpacity: 90,
      widgetBlur: 10,
      activeWorkspaceId: 'ws-default-personal',
      userName: 'Explorer',
      updatedAt: now,
    };

    await this.transaction(
      'rw',
      [this.workspaces, this.widgetInstances, this.widgetLayouts, this.settings],
      async () => {
        await this.workspaces.bulkAdd(defaultWorkspaces);
        await this.widgetInstances.bulkAdd(initialWidgets);
        await this.widgetLayouts.bulkAdd(initialLayouts);
        await this.settings.put(defaultSettings);
      }
    );
  }
}

export const db = new NookSpaceDB();
