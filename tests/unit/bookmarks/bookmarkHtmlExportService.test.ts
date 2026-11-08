import { describe, it, expect } from 'vitest';
import { exportBookmarksToNetscapeHtml } from '../../../src/features/bookmarks/services/bookmarkHtmlExportService';
import { BookmarkEntity, BookmarkGroupEntity } from '../../../src/types/bookmarks';

describe('bookmarkHtmlExportService — Milestone 6.7 Netscape HTML Exporter', () => {
  const sampleGroups: BookmarkGroupEntity[] = [
    {
      id: 'grp-dev',
      workspaceId: 'ws-1',
      title: 'Development & Tools',
      color: '#3B82F6',
      icon: 'code',
      order: 0,
      createdAt: 1600000000000,
      updatedAt: 1600000000000,
    },
    {
      id: 'grp-empty',
      workspaceId: 'ws-1',
      title: 'Empty Folder',
      color: '#10B981',
      icon: 'folder',
      order: 1,
      createdAt: 1600000000000,
      updatedAt: 1600000000000,
    },
  ];

  const sampleBookmarks: BookmarkEntity[] = [
    {
      id: 'bm-1',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitHub <Official> & "More"',
      url: 'https://github.com?q=test&lang=ts',
      description: 'Code repository & "git" hosting',
      isFavorite: true,
      order: 0,
      createdAt: 1600000100000,
      updatedAt: 1600000100000,
    },
    {
      id: 'bm-2',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'GitLab',
      url: 'https://gitlab.com',
      isFavorite: false,
      order: 1,
      createdAt: 1600000200000,
      updatedAt: 1600000200000,
    },
    {
      id: 'bm-3',
      workspaceId: 'ws-1',
      groupId: null,
      title: 'Top Level Root Bookmark',
      url: 'https://developer.mozilla.org',
      description: 'MDN Web Docs',
      isFavorite: false,
      order: 0,
      createdAt: 1600000300000,
      updatedAt: 1600000300000,
    },
    {
      id: 'bm-unsafe',
      workspaceId: 'ws-1',
      groupId: 'grp-dev',
      title: 'Malicious XSS',
      url: 'javascript:alert(1)',
      isFavorite: false,
      order: 2,
      createdAt: 1600000400000,
      updatedAt: 1600000400000,
    },
  ];

  it('1. generates valid Netscape Bookmark document headers', () => {
    const html = exportBookmarksToNetscapeHtml([], []);

    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
    expect(html).toContain('<TITLE>Bookmarks</TITLE>');
    expect(html).toContain('<H1>Bookmarks</H1>');
    expect(html).toContain('<DL><p>');
    expect(html).toContain('</DL><p>');
  });

  it('2. exports folder hierarchy, bookmark titles, URLs, and timestamps', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    expect(html).toContain('<DT><H3 ADD_DATE="1600000000" LAST_MODIFIED="1600000000">Development &amp; Tools</H3>');
    expect(html).toContain('<DT><H3 ADD_DATE="1600000000" LAST_MODIFIED="1600000000">Empty Folder</H3>');
    expect(html).toContain('HREF="https://gitlab.com"');
    expect(html).toContain('GitLab');
  });

  it('3. strictly escapes HTML characters in titles, descriptions, and URLs', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    // Title: GitHub <Official> & "More" -> GitHub &lt;Official&gt; &amp; &quot;More&quot;
    expect(html).toContain('GitHub &lt;Official&gt; &amp; &quot;More&quot;');
    // URL: & -> &amp;
    expect(html).toContain('HREF="https://github.com?q=test&amp;lang=ts"');
    // Description: Code repository & "git" hosting
    expect(html).toContain('<DD>Code repository &amp; &quot;git&quot; hosting');
  });

  it('4. strictly excludes unsafe URLs (javascript:) from export output', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    expect(html).not.toContain('javascript:alert(1)');
    expect(html).not.toContain('Malicious XSS');
  });

  it('5. exports Uncategorized bookmarks at root level', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    expect(html).toContain('HREF="https://developer.mozilla.org"');
    expect(html).toContain('Top Level Root Bookmark');
    expect(html).toContain('<DD>MDN Web Docs');
  });

  it('6. preserves favorite status attribute where applicable', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    expect(html).toContain('FAVORITE="true"');
  });

  it('7. deterministically preserves folder and bookmark order', () => {
    const html = exportBookmarksToNetscapeHtml(sampleGroups, sampleBookmarks);

    const devIndex = html.indexOf('Development &amp; Tools');
    const emptyIndex = html.indexOf('Empty Folder');
    expect(devIndex).toBeLessThan(emptyIndex);

    const gitHubIndex = html.indexOf('GitHub');
    const gitLabIndex = html.indexOf('GitLab');
    expect(gitHubIndex).toBeLessThan(gitLabIndex);
  });
});
