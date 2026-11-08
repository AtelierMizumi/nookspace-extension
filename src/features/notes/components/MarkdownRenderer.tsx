import React, { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { isSafeBookmarkUrl } from '../../bookmarks/utils/bookmarkSecurity';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  onTaskToggle?: (taskIndex: number, newCheckedState: boolean) => void;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures in restricted environments
    }
  };

  return (
    <div className="relative my-3 rounded-lg border border-slate-700 bg-slate-900/95 font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/60 text-slate-400">
        <span className="font-semibold uppercase tracking-wider">{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Parses inline markdown: bold, italic, strikethrough, inline code, and links.
 */
function renderInline(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Regex patterns for inlines:
  // 1. Link: [text](url)
  // 2. Bold: **text** or __text__
  // 3. Strikethrough: ~~text~~
  // 4. Italic: *text* or _text_
  // 5. Code: `code`
  const inlineRegex =
    /(\[(.+?)\]\((.+?)\))|(\*\*(.+?)\*\*|__(.+?)__)|(~~(.+?)~~)|(`(.+?)`)|(\*([^*]+?)\*|_([^_]+?)_)/;

  while (remaining.length > 0) {
    const match = remaining.match(inlineRegex);
    if (!match || match.index === undefined) {
      elements.push(remaining);
      break;
    }

    // Add plain text before match
    if (match.index > 0) {
      elements.push(remaining.slice(0, match.index));
    }

    const matchedStr = match[0];
    const key = `inline-${keyCounter++}`;

    if (match[1]) {
      // Link: [text](url)
      const linkText = match[2];
      const linkUrl = match[3].trim();
      const isSafe = isSafeBookmarkUrl(linkUrl);

      if (isSafe) {
        elements.push(
          <a
            key={key}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-400 underline underline-offset-2 decoration-blue-500/40 hover:decoration-blue-400 transition-colors"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
          </a>
        );
      } else {
        // Unsafe scheme -> render as plain text for security
        elements.push(
          <span key={key} className="text-slate-400 line-through" title="Blocked unsafe URL scheme">
            {linkText}
          </span>
        );
      }
    } else if (match[4]) {
      // Bold: **text** or __text__
      const boldText = match[5] || match[6];
      elements.push(
        <strong key={key} className="font-semibold text-slate-900 dark:text-slate-100">
          {renderInline(boldText)}
        </strong>
      );
    } else if (match[7]) {
      // Strikethrough: ~~text~~
      const delText = match[8];
      elements.push(
        <del key={key} className="line-through text-slate-400">
          {renderInline(delText)}
        </del>
      );
    } else if (match[9]) {
      // Inline code: `code`
      const codeText = match[10];
      elements.push(
        <code
          key={key}
          className="rounded px-1.5 py-0.5 font-mono text-[0.85em] bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/60"
        >
          {codeText}
        </code>
      );
    } else if (match[11]) {
      // Italic: *text* or _text_
      const italicText = match[12] || match[13];
      elements.push(
        <em key={key} className="italic text-slate-800 dark:text-slate-200">
          {renderInline(italicText)}
        </em>
      );
    }

    remaining = remaining.slice(match.index + matchedStr.length);
  }

  return elements;
}

export function MarkdownRenderer({ content, className = '', onTaskToggle }: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return <div className="text-slate-400 italic text-sm">Empty note</div>;
  }

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let index = 0;
  let elementKey = 0;
  let taskCounter = 0;

  while (index < lines.length) {
    const line = lines[index];
    const key = `md-el-${elementKey++}`;

    // 1. Code Block: ```lang
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      index++; // skip closing ```
      elements.push(<CodeBlock key={key} code={codeLines.join('\n')} language={lang} />);
      continue;
    }

    // 2. Empty line
    if (line.trim() === '') {
      index++;
      continue;
    }

    // 3. Horizontal Rule: --- or ***
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<hr key={key} className="my-4 border-slate-200 dark:border-slate-800" />);
      index++;
      continue;
    }

    // 4. Headers: # to ######
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2];
      const inlineChildren = renderInline(title);

      switch (level) {
        case 1:
          elements.push(
            <h1 key={key} className="text-2xl font-bold text-slate-900 dark:text-white mt-5 mb-2.5">
              {inlineChildren}
            </h1>
          );
          break;
        case 2:
          elements.push(
            <h2 key={key} className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2">
              {inlineChildren}
            </h2>
          );
          break;
        case 3:
          elements.push(
            <h3 key={key} className="text-lg font-semibold text-slate-900 dark:text-white mt-3.5 mb-1.5">
              {inlineChildren}
            </h3>
          );
          break;
        case 4:
          elements.push(
            <h4 key={key} className="text-base font-semibold text-slate-900 dark:text-white mt-3 mb-1">
              {inlineChildren}
            </h4>
          );
          break;
        case 5:
          elements.push(
            <h5 key={key} className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2.5 mb-1">
              {inlineChildren}
            </h5>
          );
          break;
        case 6:
        default:
          elements.push(
            <h6 key={key} className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 mb-1">
              {inlineChildren}
            </h6>
          );
          break;
      }
      index++;
      continue;
    }

    // 5. Blockquote: > text
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index++;
      }
      elements.push(
        <blockquote
          key={key}
          className="border-l-4 border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/20 px-3.5 py-2 my-2.5 rounded-r text-slate-700 dark:text-slate-300 italic"
        >
          {quoteLines.map((q, i) => (
            <p key={`quote-p-${i}`} className="leading-relaxed">
              {renderInline(q)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 6. Table: | col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|') && lines[index].trim().endsWith('|')) {
        tableLines.push(lines[index].trim());
        index++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const dataRows = tableLines.slice(2).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div key={key} className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  {headerRow.map((h, i) => (
                    <th key={`th-${i}`} className="px-3 py-2">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {dataRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="px-3 py-2">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 7. Task List: - [ ] or - [x]
    const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const taskListItems: { checked: boolean; text: string; taskIndex: number }[] = [];
      while (index < lines.length) {
        const currentMatch = lines[index].match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
        if (!currentMatch) break;
        const currentTaskIdx = taskCounter++;
        taskListItems.push({
          checked: currentMatch[1].toLowerCase() === 'x',
          text: currentMatch[2],
          taskIndex: currentTaskIdx,
        });
        index++;
      }

      elements.push(
        <ul key={key} className="my-2 space-y-1 text-sm text-slate-800 dark:text-slate-200">
          {taskListItems.map((item) => (
            <li key={`task-${item.taskIndex}`} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onTaskToggle?.(item.taskIndex, e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className={item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                {renderInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Unordered list: - or * or +
    if (/^[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^[-*+]\s+/, ''));
        index++;
      }
      elements.push(
        <ul key={key} className="my-2 list-disc list-inside space-y-1 text-sm text-slate-800 dark:text-slate-200">
          {listItems.map((item, i) => (
            <li key={`ul-li-${i}`} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 9. Ordered list: 1. 2.
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\d+\.\s+/, ''));
        index++;
      }
      elements.push(
        <ol key={key} className="my-2 list-decimal list-inside space-y-1 text-sm text-slate-800 dark:text-slate-200">
          {listItems.map((item, i) => (
            <li key={`ol-li-${i}`} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 10. Normal Paragraph
    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== '' &&
      !lines[index].trim().startsWith('```') &&
      !lines[index].match(/^#{1,6}\s+/) &&
      !lines[index].startsWith('>') &&
      !lines[index].match(/^[-*+]\s+/) &&
      !lines[index].match(/^\d+\.\s+/) &&
      !lines[index].match(/^(\*{3,}|-{3,}|_{3,})$/) &&
      !(lines[index].trim().startsWith('|') && lines[index].trim().endsWith('|'))
    ) {
      paragraphLines.push(lines[index]);
      index++;
    }

    elements.push(
      <p key={key} className="my-2 leading-relaxed text-sm text-slate-800 dark:text-slate-200">
        {paragraphLines.map((pLine, pIdx) => (
          <React.Fragment key={`p-line-${pIdx}`}>
            {renderInline(pLine)}
            {pIdx < paragraphLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className={`markdown-content max-w-none ${className}`}>{elements}</div>;
}
