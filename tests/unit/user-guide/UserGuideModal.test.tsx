import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserGuideModal } from '../../../src/features/user-guide/UserGuideModal';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';

describe('UserGuideModal Component', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
    vi.restoreAllMocks();
  });

  it('1. does not render when isOpen is false', () => {
    render(<UserGuideModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('2. renders modal header, title, and all 11 category items in sidebar when open', () => {
    render(<UserGuideModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Help & User Guide')).toBeInTheDocument();
    expect(screen.getByText('All Topics')).toBeInTheDocument();

    const expectedSections = [
      'Getting Started',
      'Dashboard & Widgets',
      'Productivity Suite',
      'Notes & Knowledge',
      'Smart Bookmarks',
      'Workspaces',
      'Customization & Themes',
      'Native Browser Search & Omnibox',
      'Audio-Focused Music Player',
      'AI-Assisted Flashcards',
      'AI Prompt & Vocabulary Import',
      'Data Management & Backup',
      'Privacy & Local Data Guarantees',
      'Browser Compatibility',
      'Troubleshooting & FAQ',
    ];

    for (const title of expectedSections) {
      expect(screen.getByRole('button', { name: new RegExp(title, 'i') })).toBeInTheDocument();
    }
  });

  it('3. filters topics by search keyword and displays matching content', () => {
    render(<UserGuideModal isOpen={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search guide topics, widgets, shortcuts...');
    fireEvent.change(searchInput, { target: { value: 'Pomodoro' } });

    expect(screen.getByText('Pomodoro Focus Timer')).toBeInTheDocument();
    expect(screen.queryByText('Hierarchical folders, favicon caching, tagging, and quick website access.')).not.toBeInTheDocument();
  });

  it('4. shows no results empty state when query matches nothing', () => {
    render(<UserGuideModal isOpen={true} onClose={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search guide topics, widgets, shortcuts...');
    fireEvent.change(searchInput, { target: { value: 'nonexistentquery123456' } });

    expect(screen.getByText('No guide topics match your search.')).toBeInTheDocument();
  });

  it('5. clicking a sidebar section filters content to only that section', () => {
    render(<UserGuideModal isOpen={true} onClose={vi.fn()} />);

    const musicSectionBtn = screen.getByRole('button', { name: /Audio-Focused Music Player/i });
    fireEvent.click(musicSectionBtn);

    expect(screen.getByText('Audio Playback & Provider Capabilities')).toBeInTheDocument();
  });

  it('6. switches to Vietnamese strings seamlessly when language is set to vi', () => {
    useLanguageStore.setState({ language: 'vi' });

    render(<UserGuideModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Hướng dẫn sử dụng')).toBeInTheDocument();
    expect(screen.getByText('Tất cả chủ đề')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bắt đầu sử dụng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bảng điều khiển & Tiện ích/i })).toBeInTheDocument();
    expect(screen.getByText('Quay lại Không gian')).toBeInTheDocument();
  });

  it('7. calls onClose when clicking close button or pressing Escape key', () => {
    const onClose = vi.fn();
    render(<UserGuideModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    const backBtn = screen.getByText('Back to Dashboard');
    fireEvent.click(backBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
