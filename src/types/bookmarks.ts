import { z } from 'zod';
import {
  isSafeBookmarkUrl,
  isSafeIconUrl,
  HEX_COLOR_REGEX,
  LUCIDE_ICON_REGEX,
} from '../features/bookmarks/utils/bookmarkSecurity';

// ==========================================
// 1. BOOKMARK GROUP (FOLDER) SCHEMAS & TYPES
// ==========================================

export const BookmarkGroupSchema = z
  .object({
    id: z.string().min(1, 'ID cannot be empty'),
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
      .optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative'),
    createdAt: z
      .number({ invalid_type_error: 'createdAt must be a timestamp' })
      .int('createdAt must be an integer')
      .nonnegative('createdAt cannot be negative'),
    updatedAt: z
      .number({ invalid_type_error: 'updatedAt must be a timestamp' })
      .int('updatedAt must be an integer')
      .nonnegative('updatedAt cannot be negative'),
  })
  .refine((data) => data.updatedAt >= data.createdAt, {
    message: 'updatedAt cannot be earlier than createdAt',
    path: ['updatedAt'],
  });

export type BookmarkGroupEntity = z.infer<typeof BookmarkGroupSchema>;

export const CreateBookmarkGroupSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
      .optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type CreateBookmarkGroupInput = z.input<typeof CreateBookmarkGroupSchema>;

export const UpdateBookmarkGroupSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
      .nullable()
      .optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .nullable()
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type UpdateBookmarkGroupInput = z.input<typeof UpdateBookmarkGroupSchema>;

// ==========================================
// 2. INDIVIDUAL BOOKMARK SCHEMAS & TYPES
// ==========================================

export const BookmarkSchema = z
  .object({
    id: z.string().min(1, 'ID cannot be empty'),
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    groupId: z.string().min(1, 'groupId cannot be empty string').nullable(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),
    url: z.string().refine(isSafeBookmarkUrl, {
      message: 'Invalid or prohibited URL. Only safe http:, https:, and mailto: URLs are allowed',
    }),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    iconUrl: z
      .string()
      .refine(isSafeIconUrl, {
        message: 'Icon URL must be a valid HTTPS URL without credentials',
      })
      .optional(),
    customColor: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Custom color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative'),
    createdAt: z
      .number({ invalid_type_error: 'createdAt must be a timestamp' })
      .int('createdAt must be an integer')
      .nonnegative('createdAt cannot be negative'),
    updatedAt: z
      .number({ invalid_type_error: 'updatedAt must be a timestamp' })
      .int('updatedAt must be an integer')
      .nonnegative('updatedAt cannot be negative'),
  })
  .refine((data) => data.updatedAt >= data.createdAt, {
    message: 'updatedAt cannot be earlier than createdAt',
    path: ['updatedAt'],
  });

export type BookmarkEntity = z.infer<typeof BookmarkSchema>;

export const CreateBookmarkSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    groupId: z.string().min(1, 'groupId cannot be empty string').nullable().default(null),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),
    url: z.string().refine(isSafeBookmarkUrl, {
      message: 'Invalid or prohibited URL. Only safe http:, https:, and mailto: URLs are allowed',
    }),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    iconUrl: z
      .string()
      .refine(isSafeIconUrl, {
        message: 'Icon URL must be a valid HTTPS URL without credentials',
      })
      .optional(),
    customColor: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Custom color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }).default(false),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type CreateBookmarkInput = z.input<typeof CreateBookmarkSchema>;

export const UpdateBookmarkSchema = z
  .object({
    groupId: z.string().min(1, 'groupId cannot be empty string').nullable().optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    url: z
      .string()
      .refine(isSafeBookmarkUrl, {
        message: 'Invalid or prohibited URL. Only safe http:, https:, and mailto: URLs are allowed',
      })
      .optional(),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').nullable().optional(),
    iconUrl: z
      .string()
      .refine(isSafeIconUrl, {
        message: 'Icon URL must be a valid HTTPS URL without credentials',
      })
      .nullable()
      .optional(),
    customColor: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Custom color must be a valid hex color code (e.g. #3B82F6)')
      .nullable()
      .optional(),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }).optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type UpdateBookmarkInput = z.input<typeof UpdateBookmarkSchema>;
