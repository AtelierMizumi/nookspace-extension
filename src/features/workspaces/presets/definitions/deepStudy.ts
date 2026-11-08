import { WorkspacePreset } from '../types';

export const deepStudyPreset: WorkspacePreset = {
  id: 'deep-study',
  version: 1,
  name: 'Deep Study',
  description:
    'Focused environment optimized for learning, revision, pomodoro sessions, study analytics, and knowledge notes.',
  category: 'study',
  icon: 'GraduationCap',
  color: '#10b981',
  preview: {
    highlights: [
      'Pomodoro focus timer & streak tracking',
      'Daily goals & study analytics',
      'Quick task management',
      'Integrated notes & knowledge system',
    ],
  },
  widgets: [
    {
      widgetType: 'greeting',
      config: { customName: 'Scholar' },
      layout: {
        lg: { x: 0, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
        md: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
        sm: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
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
        sm: { x: 0, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
        xs: { x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
        xxs: { x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'pomodoro',
      config: {},
      layout: {
        lg: { x: 0, y: 2, w: 4, h: 3, minW: 3, minH: 3 },
        md: { x: 0, y: 2, w: 5, h: 3, minW: 3, minH: 3 },
        sm: { x: 0, y: 4, w: 3, h: 3, minW: 2, minH: 3 },
        xs: { x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 3 },
        xxs: { x: 0, y: 4, w: 2, h: 3, minW: 2, minH: 3 },
      },
    },
    {
      widgetType: 'daily-goals',
      config: {},
      layout: {
        lg: { x: 4, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
        md: { x: 5, y: 2, w: 5, h: 3, minW: 3, minH: 2 },
        sm: { x: 3, y: 4, w: 3, h: 3, minW: 2, minH: 2 },
        xs: { x: 0, y: 7, w: 4, h: 3, minW: 2, minH: 2 },
        xxs: { x: 0, y: 7, w: 2, h: 3, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'study-tracker',
      config: {},
      layout: {
        lg: { x: 8, y: 2, w: 4, h: 3, minW: 3, minH: 3 },
        md: { x: 0, y: 5, w: 5, h: 4, minW: 3, minH: 3 },
        sm: { x: 0, y: 7, w: 6, h: 3, minW: 3, minH: 3 },
        xs: { x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 3 },
        xxs: { x: 0, y: 10, w: 2, h: 3, minW: 2, minH: 3 },
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
        lg: { x: 0, y: 5, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 5, y: 5, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 10, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 13, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 13, w: 2, h: 4, minW: 2, minH: 2 },
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
        lg: { x: 6, y: 5, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 9, w: 10, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 14, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 17, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 17, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
  ],
};
