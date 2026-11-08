import { WorkspacePreset } from '../types';

export const developerPreset: WorkspacePreset = {
  id: 'developer',
  version: 1,
  name: 'Developer',
  description:
    'Streamlined dashboard for software engineering, documentation reference, bookmarks, and project tasks.',
  category: 'development',
  icon: 'Code',
  color: '#8b5cf6',
  preview: {
    highlights: [
      'Fast documentation & repository links',
      'Smart bookmarks for engineering resources',
      'Technical notes & code snippets',
      'Sprint task tracker & schedule',
    ],
  },
  widgets: [
    {
      widgetType: 'clock',
      config: { showSeconds: true, format24h: true },
      layout: {
        lg: { x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        md: { x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        sm: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
        xs: { x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        xxs: { x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'quick-links',
      config: { links: [] },
      layout: {
        lg: { x: 4, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
        md: { x: 4, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
        sm: { x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
        xs: { x: 0, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
        xxs: { x: 0, y: 2, w: 2, h: 3, minW: 2, minH: 2 },
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
        lg: { x: 0, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 2, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 5, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 5, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 5, w: 2, h: 4, minW: 2, minH: 2 },
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
        lg: { x: 6, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 5, y: 2, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 9, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 9, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 9, w: 2, h: 4, minW: 2, minH: 2 },
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
        lg: { x: 0, y: 6, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 6, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 13, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 13, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 13, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'calendar-overview',
      config: {},
      layout: {
        lg: { x: 6, y: 6, w: 6, h: 4, minW: 3, minH: 2 },
        md: { x: 5, y: 6, w: 5, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 17, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 17, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 17, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
  ],
};
