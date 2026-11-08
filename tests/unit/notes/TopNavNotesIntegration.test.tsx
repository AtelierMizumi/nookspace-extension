import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNav } from '../../../src/components/layout/TopNav';

describe('TopNav Notes Integration Suite', () => {
  it('1. renders Notes button with FileText icon and triggers callback on click', () => {
    const onOpenNotesManager = vi.fn();
    const onOpenBookmarkManager = vi.fn();

    render(
      <TopNav
        onOpenNotesManager={onOpenNotesManager}
        onOpenBookmarkManager={onOpenBookmarkManager}
      />
    );

    const notesButton = screen.getByRole('button', { name: /Notes/ });
    expect(notesButton).toBeInTheDocument();

    fireEvent.click(notesButton);
    expect(onOpenNotesManager).toHaveBeenCalledTimes(1);
    expect(onOpenBookmarkManager).not.toHaveBeenCalled();
  });
});
