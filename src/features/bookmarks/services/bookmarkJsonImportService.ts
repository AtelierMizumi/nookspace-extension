import {
  NookSpaceBookmarkBackupV1Schema,
  ParsedBookmark,
  ParsedBookmarkGroup,
  InvalidImportEntry,
} from '../types/bookmarkImportExport';
import { isSafeBookmarkUrl, validateBookmarkUrl } from '../utils/bookmarkSecurity';

export interface JsonParseResult {
  groups: ParsedBookmarkGroup[];
  bookmarks: ParsedBookmark[];
  invalidEntries: InvalidImportEntry[];
  rejectedUnsafeUrls: number;
  duplicateBookmarksInFile: number;
}

/**
 * Parses and validates a NookSpace JSON backup string.
 * Enforces Zod schema compliance, version checking, and URL safety.
 */
export function parseNookSpaceJsonBackup(jsonContent: string): JsonParseResult {
  const groups: ParsedBookmarkGroup[] = [];
  const bookmarks: ParsedBookmark[] = [];
  const invalidEntries: InvalidImportEntry[] = [];
  let rejectedUnsafeUrls = 0;
  let duplicateBookmarksInFile = 0;

  if (!jsonContent || !jsonContent.trim()) {
    throw new Error('Empty backup file provided.');
  }

  // 1. JSON Parse
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(jsonContent);
  } catch (err: any) {
    throw new Error(`Malformed JSON syntax: ${err?.message || 'Unexpected end of JSON input'}`);
  }

  if (typeof rawParsed !== 'object' || rawParsed === null) {
    throw new Error('Invalid backup file: Root must be a valid JSON object.');
  }

  const rawObj = rawParsed as Record<string, unknown>;

  // 2. Format & Version Check
  if (rawObj.format !== 'nookspace-bookmarks') {
    throw new Error(
      `Unrecognized backup format "${rawObj.format}". Expected "nookspace-bookmarks".`
    );
  }

  if (typeof rawObj.version !== 'number' || rawObj.version !== 1) {
    if (typeof rawObj.version === 'number' && rawObj.version > 1) {
      throw new Error(
        `Unsupported backup version ${rawObj.version}. Please update NookSpace to restore this backup.`
      );
    }
    throw new Error(`Invalid or missing backup version: "${rawObj.version}".`);
  }

  // 3. Zod Schema Validation
  const parseResult = NookSpaceBookmarkBackupV1Schema.safeParse(rawParsed);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 5)
      .join('; ');
    throw new Error(`Invalid backup schema: ${errorDetails}`);
  }

  const backup = parseResult.data;

  // 4. Group Parsing & Validation
  const validGroupIds = new Set<string>();
  const seenGroupIds = new Set<string>();

  backup.data.groups.forEach((g, idx) => {
    if (seenGroupIds.has(g.id)) {
      invalidEntries.push({
        title: g.title,
        reason: `Duplicate group ID "${g.id}" in backup file`,
      });
      return;
    }
    seenGroupIds.add(g.id);
    validGroupIds.add(g.id);

    groups.push({
      tempId: g.id,
      title: g.title.slice(0, 100),
      color: g.color,
      icon: g.icon,
      order: g.order ?? idx,
    });
  });

  // 5. Bookmark Parsing & URL Safety Check
  const seenUrls = new Set<string>();
  const seenBookmarkIds = new Set<string>();

  backup.data.bookmarks.forEach((bm, idx) => {
    if (seenBookmarkIds.has(bm.id)) {
      invalidEntries.push({
        title: bm.title,
        url: bm.url,
        reason: `Duplicate bookmark ID "${bm.id}" in backup file`,
      });
      return;
    }
    seenBookmarkIds.add(bm.id);

    // Track internal file duplicates
    if (seenUrls.has(bm.url)) {
      duplicateBookmarksInFile++;
    } else {
      seenUrls.add(bm.url);
    }

    // Safety validation
    const validation = validateBookmarkUrl(bm.url);
    if (!validation.valid || !isSafeBookmarkUrl(bm.url)) {
      rejectedUnsafeUrls++;
      invalidEntries.push({
        title: bm.title,
        url: bm.url,
        reason: validation.error || 'Prohibited URL scheme or malformed URL',
      });
      return;
    }

    // Verify group existence
    const resolvedGroupId =
      bm.groupId && validGroupIds.has(bm.groupId) ? bm.groupId : null;

    bookmarks.push({
      tempId: bm.id,
      tempGroupId: resolvedGroupId,
      title: bm.title.slice(0, 200),
      url: bm.url,
      description: bm.description?.slice(0, 1000),
      iconUrl: bm.iconUrl,
      customColor: bm.customColor,
      isFavorite: bm.isFavorite ?? false,
      order: bm.order ?? idx,
      isValid: true,
    });
  });

  return {
    groups,
    bookmarks,
    invalidEntries,
    rejectedUnsafeUrls,
    duplicateBookmarksInFile,
  };
}
