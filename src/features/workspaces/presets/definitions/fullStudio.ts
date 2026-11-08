import { WorkspacePreset } from '../types';

export const fullStudioPreset: WorkspacePreset = {
  id: 'full-studio',
  version: 1,
  name: 'Full Studio',
  description:
    'The complete NookSpace command center featuring all productivity, study, bookmarking, and knowledge widgets.',
  category: 'productivity',
  icon: 'Sparkles',
  color: '#6366f1',
  preview: {
    highlights: [
      'All 10 NookSpace core widgets',
      'Pomodoro, study tracker & daily goals',
      'Smart bookmarks & full notes manager',
      'Calendar overview, quick links & task list',
    ],
  },
  widgets: [
    {
      widgetType: 'greeting',
      config: { customName: 'Commander' },
      layout: {
        lg: { x: 0, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
        md: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
        sm: { x: 0, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        xs: { x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        xxs: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'clock',
      config: { showSeconds: true, format24h: false },
      layout: {
        lg: { x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        md: { x: 6, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        sm: { x: 3, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        xs: { x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
        xxs: { x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'quick-links',
      config: { links: [] },
      layout: {
        lg: { x: 0, y: 2, w: 12, h: 2, minW: 3, minH: 2 },
        md: { x: 0, y: 2, w: 10, h: 2, minW: 3, minH: 2 },
        sm: { x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
        xs: { x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
        xxs: { x: 0, y: 4, w: 2, h: 3, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'pomodoro',
      config: {},
      layout: {
        lg: { x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
        md: { x: 0, y: 4, w: 5, h: 3, minW: 3, minH: 3 },
        sm: { x: 0, y: 5, w: 3, h: 3, minW: 2, minH: 3 },
        xs: { x: 0, y: 7, w: 4, h: 3, minW: 2, minH: 3 },
        xxs: { x: 0, y: 7, w: 2, h: 3, minW: 2, minH: 3 },
      },
    },
    {
      widgetType: 'daily-goals',
      config: {},
      layout: {
        lg: { x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
        md: { x: 5, y: 4, w: 5, h: 3, minW: 3, minH: 2 },
        sm: { x: 3, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
        xs: { x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
        xxs: { x: 0, y: 10, w: 2, h: 3, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'study-tracker',
      config: {},
      layout: {
        lg: { x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
        md: { x: 0, y: 7, w: 5, h: 4, minW: 3, minH: 3 },
        sm: { x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 3 },
        xs: { x: 0, y: 13, w: 4, h: 3, minW: 2, minH: 3 },
        xxs: { x: 0, y: 13, w: 2, h: 3, minW: 2, minH: 3 },
      },
    },
    {
      widgetType: 'todo',
      config: {
        defaultFilter: 'all',
        showPriority: true,
        showDueDate: true,
        showCategory: true,
      },
      layout: {
        lg: { x: 0, y: 7, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 5, y: 7, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 11, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 16, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'calendar-overview',
      config: {},
      layout: {
        lg: { x: 6, y: 7, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 5, y: 11, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 15, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 20, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 20, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'smart-bookmarks',
      config: {
        source: 'all',
        folderId: null,
        maxItems: 8,
        showDomain: true,
        compactDensity: false,
      },
      layout: {
        lg: { x: 0, y: 11, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 11, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 19, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 24, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 24, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'notes',
      config: {
        mode: 'recent',
        collectionId: null,
        maxItems: 5,
        showExcerpts: true,
        showCollectionLabel: true,
        density: 'comfortable',
        showCreateButton: true,
      },
      layout: {
        lg: { x: 6, y: 11, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 15, w: 10, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 23, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 28, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 28, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
  ],
};
