import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../../../src/components/ui/Modal';
import { Dropdown, DropdownItem } from '../../../src/components/ui/Dropdown';
import fs from 'fs';
import path from 'path';

describe('Milestone 10.4 — Accessibility & Responsive UX Polish Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Responsive Container & Focus Trapping', () => {
    it('renders with max-h-[calc(100vh-2rem)] and internal scrolling for small viewports', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Modal isOpen={true} onClose={handleClose} title="Responsive Modal">
          <div data-testid="modal-content">Long modal text</div>
        </Modal>
      );

      const dialogCard = container.querySelector('[role="dialog"] > div:nth-child(2)');
      expect(dialogCard).not.toBeNull();
      expect(dialogCard?.className).toContain('max-h-[calc(100vh-2rem)]');
      expect(dialogCard?.className).toContain('flex-col');
      expect(dialogCard?.className).toContain('overflow-hidden');

      const bodyContent = container.querySelector('[role="dialog"] .overflow-y-auto');
      expect(bodyContent).not.toBeNull();
      expect(bodyContent?.textContent).toContain('Long modal text');
    });

    it('traps Tab key focus inside the modal and restores focus on close', async () => {
      // Create an outside trigger button that had focus
      const trigger = document.createElement('button');
      trigger.id = 'outside-trigger';
      trigger.textContent = 'Open Dialog';
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      const TestModalWrapper = () => {
        const [isOpen, setIsOpen] = useState(true);
        return (
          <div>
            <Modal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Focus Trap Dialog"
              footer={
                <button id="modal-footer-btn" onClick={() => setIsOpen(false)}>
                  Done
                </button>
              }
            >
              <input id="modal-input" placeholder="Type here" />
            </Modal>
          </div>
        );
      };

      const { unmount } = render(<TestModalWrapper />);

      // Wait for autofocus on modal input or close button
      await waitFor(() => {
        const modalInput = document.getElementById('modal-input');
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        expect(
          document.activeElement === modalInput ||
          document.activeElement === closeBtn
        ).toBe(true);
      });

      // Press Tab across elements
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      const footerBtn = document.getElementById('modal-footer-btn')!;
      const inputEl = document.getElementById('modal-input')!;

      // Focus footer button and press Tab -> should wrap to first element (close button)
      footerBtn.focus();
      expect(document.activeElement).toBe(footerBtn);

      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(closeBtn);

      // Press Shift+Tab on closeBtn -> should wrap to last element (footer button)
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(footerBtn);

      // Close modal by clicking Done
      fireEvent.click(footerBtn);

      // Focus should be restored to trigger
      await waitFor(() => {
        expect(document.activeElement).toBe(trigger);
      });

      unmount();
      document.body.removeChild(trigger);
    });
  });

  describe('Dropdown Keyboard Navigation & Disabled Item Skipping', () => {
    it('skips disabled items during ArrowDown and ArrowUp navigation', async () => {
      const onAction1 = vi.fn();
      const onAction3 = vi.fn();

      const items: DropdownItem[] = [
        { id: '1', label: 'Item 1 (Enabled)', onClick: onAction1 },
        { id: '2', label: 'Item 2 (Disabled)', disabled: true },
        { id: '3', label: 'Item 3 (Enabled)', onClick: onAction3 },
      ];

      render(
        <Dropdown
          trigger={<button id="dropdown-trigger">Menu</button>}
          items={items}
          menuAriaLabel="Test Menu"
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(triggerBtn);

      // Wait for menu to open and autofocus first item
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('menuitem');
      expect(buttons).toHaveLength(3);

      // Initially item 1 is focused
      await waitFor(() => {
        expect(document.activeElement).toBe(buttons[0]);
      });

      // Press ArrowDown: should skip disabled item 2 and land on item 3
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(buttons[2]);

      // Press ArrowDown again: should wrap back to item 1
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(buttons[0]);

      // Press ArrowUp: should wrap back to item 3
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(buttons[2]);
    });

    it('navigates to first enabled item on Home and last enabled item on End', async () => {
      const items: DropdownItem[] = [
        { id: '1', label: 'Item 1 (Disabled)', disabled: true },
        { id: '2', label: 'Item 2 (First Enabled)' },
        { id: '3', label: 'Item 3 (Last Enabled)' },
        { id: '4', label: 'Item 4 (Disabled)', disabled: true },
      ];

      render(
        <Dropdown
          trigger={<button id="dropdown-trigger-2">Menu 2</button>}
          items={items}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /menu 2/i });
      fireEvent.click(triggerBtn);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('menuitem');

      // Home should focus item 2 (index 1)
      fireEvent.keyDown(document, { key: 'Home' });
      expect(document.activeElement).toBe(buttons[1]);

      // End should focus item 3 (index 2)
      fireEvent.keyDown(document, { key: 'End' });
      expect(document.activeElement).toBe(buttons[2]);
    });
  });

  describe('Accessibility CSS Tokens & Reduced Motion Audit', () => {
    it('defines prefers-reduced-motion media query in globals.css', () => {
      const globalsCssPath = path.resolve(process.cwd(), 'src/styles/globals.css');
      const content = fs.readFileSync(globalsCssPath, 'utf-8');

      expect(content).toContain('@media (prefers-reduced-motion: reduce)');
      expect(content).toContain('animation-duration: 0.01ms !important');
      expect(content).toContain('transition-duration: 0.01ms !important');
    });

    it('defines global focus-visible outline in globals.css', () => {
      const globalsCssPath = path.resolve(process.cwd(), 'src/styles/globals.css');
      const content = fs.readFileSync(globalsCssPath, 'utf-8');

      expect(content).toContain(':focus-visible');
      expect(content).toContain('outline: 2px solid hsl(var(--ring))');
    });

    it('defines xs: 480px responsive breakpoint in tailwind.config.js', () => {
      const tailwindConfigPath = path.resolve(process.cwd(), 'tailwind.config.js');
      const content = fs.readFileSync(tailwindConfigPath, 'utf-8');

      expect(content).toContain("xs: '480px'");
    });

    it('ensures NotesManagerModal and BookmarkManagerModal have explicit accessible labels and focus trap handling', () => {
      const notesModalPath = path.resolve(process.cwd(), 'src/features/notes/components/NotesManagerModal.tsx');
      const notesContent = fs.readFileSync(notesModalPath, 'utf-8');
      expect(notesContent).toContain('aria-label="Close notes manager"');
      expect(notesContent).toContain('aria-label={mobilePanel === \'editor\' ? \'Back to notes list\' : \'Back to folders and tags\'}');
      expect(notesContent).toContain('previousActiveElement.current = document.activeElement');

      const bookmarkModalPath = path.resolve(process.cwd(), 'src/features/bookmarks/components/BookmarkManagerModal.tsx');
      const bookmarkContent = fs.readFileSync(bookmarkModalPath, 'utf-8');
      expect(bookmarkContent).toContain('aria-label="Close Bookmark Manager"');
      expect(bookmarkContent).toContain('aria-label={mobileView === \'sidebar\' ? \'View bookmarks\' : \'View folders\'}');
      expect(bookmarkContent).toContain('previousActiveElement.current = document.activeElement');
    });
  });
});
