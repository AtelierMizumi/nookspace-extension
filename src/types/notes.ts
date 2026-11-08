import { z } from 'zod';

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const LUCIDE_ICON_REGEX = /^[a-z0-9-]+$/;

/**
 * Strips basic Markdown markup and returns a normalized plain-text excerpt.
 */
export function generateExcerpt(content: string, maxLength = 300): string {
  if (!content) return '';

  const plain = content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images and links [text](url) -> text
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove headers (#, ##, etc.)
    .replace(/#{1,6}\s+/g, '')
    // Remove bold and italic (* or _)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes and list markers
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Collapse whitespace and newlines
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return plain.slice(0, maxLength).trimEnd() + '...';
}

// ==========================================
// 1. NOTE COLLECTION (FOLDER) SCHEMAS & TYPES
// ==========================================

export const NoteCollectionSchema = z
  .object({
    id: z.string().min(1, 'ID cannot be empty'),
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
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

export type NoteCollectionEntity = z.infer<typeof NoteCollectionSchema>;

export const CreateNoteCollectionSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type CreateNoteCollectionInput = z.input<typeof CreateNoteCollectionSchema>;

export const UpdateNoteCollectionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code (e.g. #3B82F6)')
      .nullable()
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, 'Icon identifier cannot exceed 50 characters')
      .regex(LUCIDE_ICON_REGEX, 'Icon must be a valid Lucide icon identifier')
      .nullable()
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type UpdateNoteCollectionInput = z.input<typeof UpdateNoteCollectionSchema>;

// ==========================================
// 2. NOTE TAG SCHEMAS & TYPES
// ==========================================

export const NoteTagSchema = z
  .object({
    id: z.string().min(1, 'ID cannot be empty'),
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    name: z
      .string()
      .trim()
      .min(1, 'Tag name cannot be empty')
      .max(50, 'Tag name cannot exceed 50 characters')
      .toLowerCase(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .optional(),
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

export type NoteTagEntity = z.infer<typeof NoteTagSchema>;

export const CreateNoteTagSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    name: z
      .string()
      .trim()
      .min(1, 'Tag name cannot be empty')
      .max(50, 'Tag name cannot exceed 50 characters')
      .toLowerCase(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .optional(),
  })
  .strict();

export type CreateNoteTagInput = z.input<typeof CreateNoteTagSchema>;

export const UpdateNoteTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tag name cannot be empty')
      .max(50, 'Tag name cannot exceed 50 characters')
      .toLowerCase()
      .optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateNoteTagInput = z.input<typeof UpdateNoteTagSchema>;

// ==========================================
// 3. NOTE SCHEMAS & TYPES
// ==========================================

export const NoteSchema = z
  .object({
    id: z.string().min(1, 'ID cannot be empty'),
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    collectionId: z.string().min(1, 'collectionId cannot be empty string').nullable(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),
    content: z.string().max(500000, 'Content cannot exceed 500KB'),
    excerpt: z.string().max(300, 'Excerpt cannot exceed 300 characters'),
    isPinned: z.boolean({ invalid_type_error: 'isPinned must be a boolean' }),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }),
    isArchived: z.boolean({ invalid_type_error: 'isArchived must be a boolean' }),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(50)
          .toLowerCase()
      )
      .default([]),
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

export type NoteEntity = z.infer<typeof NoteSchema>;

export const CreateNoteSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    collectionId: z.string().min(1, 'collectionId cannot be empty string').nullable().default(null),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),
    content: z.string().max(500000, 'Content cannot exceed 500KB').default(''),
    excerpt: z.string().max(300).optional(),
    isPinned: z.boolean({ invalid_type_error: 'isPinned must be a boolean' }).default(false),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }).default(false),
    isArchived: z.boolean({ invalid_type_error: 'isArchived must be a boolean' }).default(false),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(50)
          .toLowerCase()
      )
      .default([]),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type CreateNoteInput = z.input<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z
  .object({
    collectionId: z.string().min(1, 'collectionId cannot be empty string').nullable().optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    content: z.string().max(500000, 'Content cannot exceed 500KB').optional(),
    excerpt: z.string().max(300).optional(),
    isPinned: z.boolean({ invalid_type_error: 'isPinned must be a boolean' }).optional(),
    isFavorite: z.boolean({ invalid_type_error: 'isFavorite must be a boolean' }).optional(),
    isArchived: z.boolean({ invalid_type_error: 'isArchived must be a boolean' }).optional(),
    color: z
      .string()
      .trim()
      .regex(HEX_COLOR_REGEX, 'Color must be a valid hex color code')
      .nullable()
      .optional(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(50)
          .toLowerCase()
      )
      .optional(),
    order: z
      .number({ invalid_type_error: 'Order must be a number' })
      .int('Order must be an integer')
      .nonnegative('Order cannot be negative')
      .optional(),
  })
  .strict();

export type UpdateNoteInput = z.input<typeof UpdateNoteSchema>;

// ==========================================
// 4. NOTE-BOOKMARK JUNCTION SCHEMAS & TYPES
// ==========================================

export const NoteBookmarkLinkSchema = z.object({
  id: z.string().min(1, 'ID cannot be empty'),
  workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
  noteId: z.string().min(1, 'noteId cannot be empty'),
  bookmarkId: z.string().min(1, 'bookmarkId cannot be empty'),
  createdAt: z
    .number({ invalid_type_error: 'createdAt must be a timestamp' })
    .int('createdAt must be an integer')
    .nonnegative('createdAt cannot be negative'),
});

export type NoteBookmarkLinkEntity = z.infer<typeof NoteBookmarkLinkSchema>;

export const CreateNoteBookmarkLinkSchema = z
  .object({
    workspaceId: z.string().trim().min(1, 'workspaceId cannot be empty'),
    noteId: z.string().min(1, 'noteId cannot be empty'),
    bookmarkId: z.string().min(1, 'bookmarkId cannot be empty'),
  })
  .strict();

export type CreateNoteBookmarkLinkInput = z.input<typeof CreateNoteBookmarkLinkSchema>;
