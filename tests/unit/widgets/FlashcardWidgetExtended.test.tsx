import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  FlashcardWidgetComponent,
  FlashcardWidgetSettings,
} from '../../../src/widgets/FlashcardWidget';
import { useLanguageStore } from '../../../src/services/i18n/i18nStore';
import { flashcardRepository } from '../../../src/features/flashcards/flashcardRepository';
import { db } from '../../../src/services/database/db';

describe('FlashcardWidget Extended Features — Expiration, Deck Management & Test Mode', () => {
  beforeEach(async () => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
    vi.restoreAllMocks();
    await db.vocabulary.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. shows Deck Expired state when active deck has expired', async () => {
    // Add expired deck metadata
    const pastTime = Date.now() - 3600 * 1000; // 1 hour ago
    flashcardRepository.saveDeckMetadata(
      {
        deckId: 'deck-expired',
        deckName: 'Japanese Core 50',
        sourceLanguage: 'Japanese',
        targetLanguage: 'Vietnamese',
        totalCards: 1,
        createdAt: pastTime - 86400000,
        activatedAt: pastTime - 86400000,
        expiresAt: pastTime,
        expirationHours: 24,
      },
      'ws-1'
    );

    await db.vocabulary.add({
      id: 'card-expired-1',
      workspaceId: 'ws-1',
      word: '学生',
      meaning: 'học sinh',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'new',
      createdAt: pastTime,
      updatedAt: pastTime,
    });

    render(
      <FlashcardWidgetComponent
        instanceId="inst-fc-exp"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Deck Expired')).toBeInTheDocument();
      expect(screen.getByText('Replace Deck')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  it('2. switches to Test Mode, configures and takes an interactive test', async () => {
    await db.vocabulary.bulkAdd([
      {
        id: 'tc-1',
        workspaceId: 'ws-test',
        word: '本',
        meaning: 'Quyển sách',
        category: 'general',
        sourceLanguage: 'Japanese',
        targetLanguage: 'Vietnamese',
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'tc-2',
        workspaceId: 'ws-test',
        word: '水',
        meaning: 'Nước',
        category: 'general',
        sourceLanguage: 'Japanese',
        targetLanguage: 'Vietnamese',
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    render(
      <FlashcardWidgetComponent
        instanceId="inst-fc-testmode"
        workspaceId="ws-test"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Click 'Test' mode tab
    fireEvent.click(screen.getByText('Test'));

    await waitFor(() => {
      expect(screen.getByText('Vocabulary Test Configuration')).toBeInTheDocument();
      expect(screen.getByText('Start Test')).toBeInTheDocument();
    });

    // Click Start Test
    fireEvent.click(screen.getByText('Start Test'));

    await waitFor(() => {
      expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
    });
  });

  it('3. Settings modal allows replacing deck with valid JSON', async () => {
    const onSaveConfig = vi.fn();
    const onClose = vi.fn();

    render(
      <FlashcardWidgetSettings
        workspaceId="ws-replace"
        config={{}}
        onSaveConfig={onSaveConfig}
        onClose={onClose}
      />
    );

    // Switch to Import tab
    fireEvent.click(screen.getByText('3. Import JSON'));

    const textarea = screen.getByPlaceholderText(/Paste JSON here/i);
    const validJson = JSON.stringify({
      version: 1,
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      deckName: 'New Vocabulary Deck',
      cards: [
        {
          word: '先生',
          reading: 'せんせい',
          meaning: 'Giáo viên',
        },
      ],
    });

    fireEvent.change(textarea, { target: { value: validJson } });

    await waitFor(() => {
      expect(screen.getByText(/1 cards detected/i)).toBeInTheDocument();
    });

    const replaceBtn = screen.getByText('Replace Deck');
    fireEvent.click(replaceBtn);

    // Confirm dialog opens
    await waitFor(() => {
      expect(screen.getByText(/Replace current deck with new vocabulary cards/i)).toBeInTheDocument();
    });
  });
});
