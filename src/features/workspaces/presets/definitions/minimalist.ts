import { WorkspacePreset } from '../types';

export const minimalistPreset: WorkspacePreset = {
  id: 'minimalist',
  version: 1,
  name: 'Minimalist',
  description:
    'A clean, distraction-free space with essential timekeeping, greeting, quick links, and tasks.',
  category: 'personal',
  icon: 'Home',
  color: null,
  preview: {
    highlights: [
      'Distraction-free environment',
      'Clock & friendly greeting',
      'Quick links for essential bookmarks',
      'Daily tasks list',
    ],
  },
  widgets: [
    {
      widgetType: 'greeting',
      config: { customName: 'Architect' },
      layout: {
        lg: { x: 0, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
        md: { x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
        sm: { x: 3, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
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
        sm: { x: 0, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        xs: { x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
        xxs: { x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
      },
    },
    {
      widgetType: 'quick-links',
      config: { links: [] },
      layout: {
        lg: { x: 0, y: 2, w: 5, h: 4, minW: 3, minH: 2 },
        md: { x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
        xs: { x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
        xxs: { x: 0, y: 4, w: 2, h: 3, minW: 2, minH: 2 },
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
        lg: { x: 5, y: 2, w: 7, h: 4, minW: 3, minH: 2 },
        md: { x: 4, y: 2, w: 6, h: 4, minW: 3, minH: 2 },
        sm: { x: 0, y: 5, w: 6, h: 4, minW: 3, minH: 2 },
        xs: { x: 0, y: 7, w: 4, h: 4, minW: 2, minH: 2 },
        xxs: { x: 0, y: 7, w: 2, h: 4, minW: 2, minH: 2 },
      },
    },
  ],
};
