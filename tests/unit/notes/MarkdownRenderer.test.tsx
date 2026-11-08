import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownRenderer } from '../../../src/features/notes/components/MarkdownRenderer';

describe('MarkdownRenderer Suite', () => {
  it('1. renders empty placeholder when content is empty', () => {
    render(<MarkdownRenderer content="" />);
    expect(screen.getByText('Empty note')).toBeInTheDocument();
  });

  it('2. renders headings from h1 to h6', () => {
    const md = '# Header 1\n## Header 2\n### Header 3';
    render(<MarkdownRenderer content={md} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Header 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Header 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Header 3' })).toBeInTheDocument();
  });

  it('3. renders inline formatting: bold, italic, strikethrough, inline code', () => {
    const md = 'This is **bold**, *italic*, ~~strikethrough~~, and `code`.';
    const { container } = render(<MarkdownRenderer content={md} />);

    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('del')?.textContent).toBe('strikethrough');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('4. strictly validates links: renders safe https link and neutralizes unsafe javascript link', () => {
    const md = '[Safe](https://example.com) and [Unsafe](javascript:alert(1))';
    const { container } = render(<MarkdownRenderer content={md} />);

    const safeLink = screen.getByRole('link', { name: /Safe/ });
    expect(safeLink).toBeInTheDocument();
    expect(safeLink).toHaveAttribute('href', 'https://example.com');
    expect(safeLink).toHaveAttribute('target', '_blank');
    expect(safeLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Unsafe link is blocked: no <a> tag for unsafe
    const unsafeLink = container.querySelector('a[href^="javascript:"]');
    expect(unsafeLink).toBeNull();
    expect(screen.getByText('Unsafe')).toHaveClass('line-through');
  });

  it('5. renders code blocks with language badge', () => {
    const md = '```typescript\nconst greeting = "hello";\n```';
    render(<MarkdownRenderer content={md} />);

    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('const greeting = "hello";')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
  });

  it('6. renders task lists and handles interactive toggling', () => {
    const onTaskToggle = vi.fn();
    const md = '- [ ] Task item 1\n- [x] Task item 2';
    render(<MarkdownRenderer content={md} onTaskToggle={onTaskToggle} />);

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].checked).toBe(true);

    fireEvent.click(checkboxes[0]);
    expect(onTaskToggle).toHaveBeenCalledWith(0, true);
  });

  it('7. renders markdown tables with headers and rows', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 25 |';
    render(<MarkdownRenderer content={md} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('8. renders blockquotes', () => {
    const md = '> This is a famous quote.';
    const { container } = render(<MarkdownRenderer content={md} />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote?.textContent).toContain('This is a famous quote.');
  });
});
