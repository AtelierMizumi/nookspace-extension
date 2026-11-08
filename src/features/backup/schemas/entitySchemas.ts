import { z } from 'zod';
import { HEX_COLOR_REGEX } from '../../../types/notes';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';

// ==========================================
// 1. WIDGET PERSISTED ENTITY SCHEMAS
// ==========================================

export const BreakpointSchema = z.enum(['lg', 'md', 'sm', 'xs', 'xxs']);

export const WidgetLayoutEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  widgetInstanceId: z.string().min(1),
  breakpoint: BreakpointSchema,
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  minW: z.number().int().positive().optional(),
  minH: z.number().int().positive().optional(),
  maxW: z.number().int().positive().optional(),
  maxH: z.number().int().positive().optional(),
  isDefault: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const WidgetInstanceEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  widgetType: z.string().min(1),
  title: z.string().optional(),
  config: z.record(z.unknown()),
  isEnabled: z.boolean(),
  order: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

// ==========================================
// 2. PRODUCTIVITY & LEARNING MISSING SCHEMAS
// ==========================================

export const StickyNoteEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  content: z.string(),
  color: z.string().regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code'),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  zIndex: z.number().int(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const VocabularyStatusSchema = z.enum(['new', 'learning', 'mastered']);

export const VocabularyEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  word: z.string().trim().min(1),
  reading: z.string().trim().optional(),
  romanization: z.string().trim().optional(),
  meaning: z.string().trim().min(1),
  partOfSpeech: z.string().optional(),
  exampleSentence: z.string().optional(),
  exampleTranslation: z.string().optional(),
  category: z.string().trim().min(1),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
  note: z.string().optional(),
  status: VocabularyStatusSchema,
  difficultyRating: z.enum(['easy', 'good', 'hard']).optional(),
  lastReviewedAt: z.number().int().nonnegative().optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const ResourceEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  title: z.string().trim().min(1),
  url: z.string().min(1),
  description: z.string().optional(),
  category: z.string().trim().optional(),
  tags: z.array(z.string().trim()),
  isPinned: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const BackupBookmarkEntitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().trim().min(1),
  groupId: z.string().nullable(),
  title: z.string().trim().min(1).max(200),
  url: z.string().min(1),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().optional(),
  customColor: z.string().optional(),
  isFavorite: z.boolean(),
  order: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const CalendarEventEntitySchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1).optional(),
    title: z.string().trim().min(1),
    description: z.string().optional(),
    startDate: z.number().int().nonnegative(),
    endDate: z.number().int().nonnegative(),
    isAllDay: z.boolean(),
    category: z.string().trim().optional(),
    color: z.string().regex(HEX_COLOR_REGEX).optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate cannot be earlier than startDate',
    path: ['endDate'],
  });

export const LanguageCodeSchema = z.enum(['en', 'vi']);

export const SearchEngineProviderSchema = z.enum(['google', 'bing', 'duckduckgo']);

export const BackgroundModeSchema = z.enum(['cover', 'contain', 'stretch', 'center']);

export const BackgroundOverlaySchema = z.number().min(0).max(100);

export const BrowserStartupBehaviorSchema = z.enum([
  'new-tab-only',
  'browser-startup',
  'both',
  'keep-browser-defaults',
  'open-on-startup',
  'preserve-browser-startup',
]);

export const StartupSetupStatusSchema = z.enum([
  'not-configured',
  'manual-verification-required',
  'verified',
]);

export const DetectedBrowserFamilySchema = z.enum([
  'chrome',
  'edge',
  'brave',
  'coccoc',
  'firefox',
  'zen',
  'other',
]);

export const AppSettingsEntitySchema = z.object({
  id: z.literal('current_settings'),
  theme: z.enum(['light', 'dark', 'system']),
  accentColor: z.string().regex(HEX_COLOR_REGEX),
  fontFamily: z.string().min(1),
  fontSize: z.enum(['sm', 'md', 'lg']),
  backgroundType: z.enum(['color', 'gradient', 'image']),
  backgroundValue: z.string(),
  backgroundMode: BackgroundModeSchema.optional(),
  backgroundOverlay: BackgroundOverlaySchema.optional(),
  widgetOpacity: z.number().min(0).max(100),
  widgetBlur: z.number().min(0).max(100),
  activeWorkspaceId: z.string().min(1),
  userName: z.string().optional(),
  updatedAt: z.number().int().nonnegative(),
  language: LanguageCodeSchema.optional(),
  searchEngine: SearchEngineProviderSchema.optional(),
  startupBehavior: BrowserStartupBehaviorSchema.optional(),
  startupSetupStatus: StartupSetupStatusSchema.optional(),
  startupSetupBrowser: DetectedBrowserFamilySchema.optional(),
});
