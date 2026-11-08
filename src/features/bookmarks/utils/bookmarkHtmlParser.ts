import {
  ParsedBookmark,
  ParsedBookmarkGroup,
  InvalidImportEntry,
} from '../types/bookmarkImportExport';
import { isSafeBookmarkUrl, validateBookmarkUrl } from './bookmarkSecurity';

export interface HtmlParseResult {
  groups: ParsedBookmarkGroup[];
  bookmarks: ParsedBookmark[];
  invalidEntries: InvalidImportEntry[];
  rejectedUnsafeUrls: number;
}

/**
 * Safely parses Netscape Bookmark HTML into normalized candidate groups and bookmarks.
 * Uses the browser/DOMParser without executing scripts or loading external resources.
 */
export function parseNetscapeBookmarkHtml(htmlContent: string): HtmlParseResult {
  const groups: ParsedBookmarkGroup[] = [];
  const bookmarks: ParsedBookmark[] = [];
  const invalidEntries: InvalidImportEntry[] = [];
  let rejectedUnsafeUrls = 0;

  if (!htmlContent || !htmlContent.trim()) {
    return { groups, bookmarks, invalidEntries, rejectedUnsafeUrls };
  }

  // Use DOMParser to parse HTML safely in a detached DOM Document
  // Pre-process unclosed <H3> tags common in browser bookmark exports
  // Browser exports (like Netscape format) often have <H3>Title<DL> without a closing </H3>
  const normalizedHtml = htmlContent.replace(
    /<h3\b([^>]*)>(.*?)(?:<\/h3>|(?=<dl\b|<dt\b|<h3\b|$))/gis,
    (_match, attrs, content) => `<h3${attrs}>${content}</h3>`
  );

  const parser = new DOMParser();
  const doc = parser.parseFromString(normalizedHtml, 'text/html');

  let groupCounter = 1;
  let bookmarkCounter = 1;

  /**
   * Helper to inspect the next sibling element for a <DD> description.
   */
  function findDescription(element: Element): string | undefined {
    let next: Element | null = element.nextElementSibling;
    // Walk through siblings until we hit a DD or another DT/DL
    while (next) {
      const tagName = next.tagName.toUpperCase();
      if (tagName === 'DD') {
        return next.textContent?.trim() || undefined;
      }
      if (tagName === 'DT' || tagName === 'DL') {
        break;
      }
      next = next.nextElementSibling;
    }
    return undefined;
  }

  /**
   * Recursively traverses a <DL> or container element.
   */
  function traverseContainer(
    container: Element,
    currentGroupId: string | null,
    folderPath: string[]
  ): void {
    const children = Array.from(container.children);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName.toUpperCase();

      if (tagName === 'DT') {
        // A <DT> can contain an <H3> (folder header) or an <A> (bookmark)
        const h3 = child.querySelector('h3, H3');
        const a = child.querySelector('a, A');

        if (h3) {
          let rawTitle = '';
          for (let j = 0; j < h3.childNodes.length; j++) {
            const node = h3.childNodes[j];
            if (node.nodeType === Node.TEXT_NODE) {
              rawTitle += node.textContent || '';
            } else {
              break;
            }
          }
          rawTitle = rawTitle.trim() || h3.textContent?.trim() || 'Untitled Folder';
          const newPath = [...folderPath, rawTitle];

          // Subfolder display title preserves parent path if nested (e.g. "Work / Projects")
          const groupTitle = newPath.length > 1 ? newPath.join(' / ') : rawTitle;

          const tempId = `import-grp-${groupCounter++}`;
          groups.push({
            tempId,
            title: groupTitle.slice(0, 100),
            order: groups.length,
          });

          // Look for the corresponding <DL> for this folder
          // It can be a child of this <DT> or the next sibling of this <DT>
          let dl = child.querySelector('dl, DL');
          if (!dl && i + 1 < children.length && children[i + 1].tagName.toUpperCase() === 'DL') {
            dl = children[i + 1];
            i++; // skip next since it is the DL container
          }

          if (dl) {
            traverseContainer(dl, tempId, newPath);
          }
        } else if (a) {
          processAnchor(a, currentGroupId, child);
        }
      } else if (tagName === 'A') {
        processAnchor(child, currentGroupId, child);
      } else if (tagName === 'DL') {
        traverseContainer(child, currentGroupId, folderPath);
      }
    }
  }

  function processAnchor(
    a: Element,
    tempGroupId: string | null,
    contextElement: Element
  ): void {
    const href = (a.getAttribute('href') || a.getAttribute('HREF') || '').trim();
    const title = (a.textContent?.trim() || href || 'Untitled Bookmark').slice(0, 200);
    const description = findDescription(contextElement)?.slice(0, 1000);
    const isFavorite =
      a.getAttribute('favorite') === 'true' ||
      a.getAttribute('FAVORITE') === 'true' ||
      a.getAttribute('favorite') === '1';

    if (!href) {
      invalidEntries.push({
        title,
        reason: 'Missing URL',
      });
      return;
    }

    const validation = validateBookmarkUrl(href);
    if (!validation.valid || !isSafeBookmarkUrl(href)) {
      rejectedUnsafeUrls++;
      invalidEntries.push({
        title,
        url: href,
        reason: validation.error || 'Prohibited URL scheme or malformed URL',
      });
      return;
    }

    const tempId = `import-bm-${bookmarkCounter++}`;
    bookmarks.push({
      tempId,
      tempGroupId,
      title,
      url: href,
      description,
      isFavorite,
      order: bookmarks.length,
      isValid: true,
    });
  }

  // Find root <DL> elements or search within body
  const rootDls = doc.body ? Array.from(doc.body.querySelectorAll('dl, DL')) : [];

  if (rootDls.length > 0) {
    // Traverse the primary top-level <DL>
    traverseContainer(rootDls[0], null, []);
  } else {
    // If no <DL> is found, find all standalone <A> tags in the document
    const allAnchors = Array.from(doc.querySelectorAll('a, A'));
    for (const a of allAnchors) {
      processAnchor(a, null, a);
    }
  }

  return {
    groups,
    bookmarks,
    invalidEntries,
    rejectedUnsafeUrls,
  };
}
