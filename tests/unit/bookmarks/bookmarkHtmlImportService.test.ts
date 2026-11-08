import { describe, it, expect } from 'vitest';
import { parseNetscapeBookmarkHtml } from '../../../src/features/bookmarks/utils/bookmarkHtmlParser';

describe('bookmarkHtmlImportService — Milestone 6.7 Netscape HTML Parser', () => {
  it('1. returns empty lists for empty or whitespace content', () => {
    const result = parseNetscapeBookmarkHtml('   ');
    expect(result.groups).toHaveLength(0);
    expect(result.bookmarks).toHaveLength(0);
    expect(result.invalidEntries).toHaveLength(0);
    expect(result.rejectedUnsafeUrls).toBe(0);
  });

  it('2. parses standard Netscape bookmark HTML with folders, bookmarks, and descriptions', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><H3 ADD_DATE="1600000000">Development</H3>
        <DL><p>
          <DT><A HREF="https://github.com" ADD_DATE="1600000001" FAVORITE="true">GitHub</A>
          <DD>Code hosting & collaboration
          <DT><A HREF="https://gitlab.com">GitLab</A>
        </DL><p>
        <DT><A HREF="https://developer.mozilla.org">MDN Web Docs</A>
        <DD>Web standards guide
      </DL><p>
    `;

    const result = parseNetscapeBookmarkHtml(html);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].title).toBe('Development');

    expect(result.bookmarks).toHaveLength(3);

    // GitHub inside Development group
    const gitHub = result.bookmarks.find((b) => b.title === 'GitHub');
    expect(gitHub).toBeDefined();
    expect(gitHub?.url).toBe('https://github.com');
    expect(gitHub?.tempGroupId).toBe(result.groups[0].tempId);
    expect(gitHub?.description).toBe('Code hosting & collaboration');
    expect(gitHub?.isFavorite).toBe(true);

    // GitLab inside Development group
    const gitLab = result.bookmarks.find((b) => b.title === 'GitLab');
    expect(gitLab).toBeDefined();
    expect(gitLab?.tempGroupId).toBe(result.groups[0].tempId);

    // MDN at root (uncategorized)
    const mdn = result.bookmarks.find((b) => b.title === 'MDN Web Docs');
    expect(mdn).toBeDefined();
    expect(mdn?.tempGroupId).toBeNull();
    expect(mdn?.description).toBe('Web standards guide');
  });

  it('3. handles nested folders by preserving full path hierarchy', () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3>Engineering</H3>
        <DL><p>
          <DT><H3>Frontend</H3>
          <DL><p>
            <DT><A HREF="https://react.dev">React</A>
          </DL><p>
        </DL><p>
      </DL><p>
    `;

    const result = parseNetscapeBookmarkHtml(html);

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].title).toBe('Engineering');
    expect(result.groups[1].title).toBe('Engineering / Frontend');

    const react = result.bookmarks.find((b) => b.title === 'React');
    expect(react?.tempGroupId).toBe(result.groups[1].tempId);
  });

  it('4. automatically decodes HTML entities in titles, descriptions, and URLs', () => {
    const html = `
      <DL><p>
        <DT><A HREF="https://example.com?query=a&amp;b=c">AT&amp;T &quot;Official&quot; &lt;Portal&gt;</A>
        <DD>Phone &amp; Internet &copy; 2026
      </DL><p>
    `;

    const result = parseNetscapeBookmarkHtml(html);

    expect(result.bookmarks).toHaveLength(1);
    expect(result.bookmarks[0].title).toBe('AT&T "Official" <Portal>');
    expect(result.bookmarks[0].url).toBe('https://example.com?query=a&b=c');
    expect(result.bookmarks[0].description).toBe('Phone & Internet © 2026');
  });

  it('5. strictly filters and rejects unsafe URL schemes (javascript:, data:, file:)', () => {
    const html = `
      <DL><p>
        <DT><A HREF="javascript:alert(document.cookie)">Malicious Script</A>
        <DT><A HREF="data:text/html,<b>pwned</b>">Data URL</A>
        <DT><A HREF="https://legit.com">Legit Website</A>
      </DL><p>
    `;

    const result = parseNetscapeBookmarkHtml(html);

    expect(result.bookmarks).toHaveLength(1);
    expect(result.bookmarks[0].url).toBe('https://legit.com');
    expect(result.rejectedUnsafeUrls).toBe(2);
    expect(result.invalidEntries).toHaveLength(2);
    expect(result.invalidEntries[0].title).toBe('Malicious Script');
  });

  it('6. recovers from malformed but repairable browser HTML', () => {
    // Unclosed tags, mixed casing, missing quotes
    const html = `
      <dl>
        <dt><H3>Work
        <dl>
          <dt><a href=https://slack.com>Slack
        </dl>
        <dt><a href="https://notion.so">Notion</a>
      </dl>
    `;

    const result = parseNetscapeBookmarkHtml(html);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].title).toBe('Work');
    expect(result.bookmarks).toHaveLength(2);
    expect(result.bookmarks.find((b) => b.url === 'https://slack.com')).toBeDefined();
    expect(result.bookmarks.find((b) => b.url === 'https://notion.so')).toBeDefined();
  });
});
