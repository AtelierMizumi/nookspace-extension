import {
  parseNetscapeBookmarkHtml,
  HtmlParseResult,
} from '../utils/bookmarkHtmlParser';

/**
 * Service providing Netscape Bookmark HTML parsing and normalization.
 */
export class BookmarkHtmlImportService {
  /**
   * Parses standard Netscape Bookmark HTML content into candidate groups and bookmarks.
   */
  static parse(htmlContent: string): HtmlParseResult {
    return parseNetscapeBookmarkHtml(htmlContent);
  }
}

export { parseNetscapeBookmarkHtml };
