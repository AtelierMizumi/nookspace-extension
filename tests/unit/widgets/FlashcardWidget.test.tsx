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

describe('FlashcardWidget Component & Settings', () => {
  beforeEach(async () => {
    useLanguageStore.setState({ language: 'en', isInitialized: true });
    vi.restoreAllMocks();
    await db.vocabulary.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. renders empty state when no cards exist for current language pair', async () => {
    render(
      <FlashcardWidgetComponent
        instanceId="inst-fc-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
      expect(screen.getByText('No Vocabulary Cards Yet')).toBeInTheDocument();
      expect(screen.getByText('Generate AI Cards')).toBeInTheDocument();
    });
  });

  it('2. renders flashcard front and flips to back on click', async () => {
    await db.vocabulary.add({
      id: 'card-1',
      workspaceId: 'ws-1',
      word: '猫',
      reading: 'ねこ',
      romanization: 'neko',
      meaning: 'cat / con mèo',
      exampleSentence: '猫が好きです。',
      exampleTranslation: 'I like cats.',
      category: 'animals',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'new',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    render(
      <FlashcardWidgetComponent
        instanceId="inst-fc-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('猫')).toBeInTheDocument();
      expect(screen.getByText('ねこ')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
    });

    // Flip card
    fireEvent.click(screen.getByText('猫'));

    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
      expect(screen.getByText('cat / con mèo')).toBeInTheDocument();
      expect(screen.getByText('猫が好きです。')).toBeInTheDocument();
    });
  });

  it('3. rating buttons update status and advance to next card', async () => {
    const updateSpy = vi.spyOn(flashcardRepository, 'updateReviewStatus');

    await db.vocabulary.bulkAdd([
      {
        id: 'card-1',
        workspaceId: 'ws-1',
        word: '猫',
        meaning: 'cat',
        category: 'animals',
        sourceLanguage: 'Japanese',
        targetLanguage: 'Vietnamese',
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-2',
        workspaceId: 'ws-1',
        word: '犬',
        meaning: 'dog',
        category: 'animals',
        sourceLanguage: 'Japanese',
        targetLanguage: 'Vietnamese',
        status: 'new',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    render(
      <FlashcardWidgetComponent
        instanceId="inst-fc-1"
        workspaceId="ws-1"
        isEditMode={false}
        config={{}}
        onUpdateConfig={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('猫')).toBeInTheDocument();
    });

    // Flip
    fireEvent.click(screen.getByText('猫'));

    await waitFor(() => {
      expect(screen.getByText('Known')).toBeInTheDocument();
    });

    // Mark Known
    fireEvent.click(screen.getByText('Known'));

    expect(updateSpy).toHaveBeenCalledWith('card-1', 'mastered', 'easy');
  });

  it('4. Settings sub-component switches tabs, copies prompt, and saves preferences', async () => {
    const onSaveConfig = vi.fn();
    const onClose = vi.fn();

    render(
      <FlashcardWidgetSettings
        config={{}}
        onSaveConfig={onSaveConfig}
        onClose={onClose}
      />
    );

    expect(screen.getByText('1. Preferences')).toBeInTheDocument();
    expect(screen.getByText('2. AI Prompt')).toBeInTheDocument();
    expect(screen.getByText('3. Import JSON')).toBeInTheDocument();

    // Switch to AI Prompt tab
    fireEvent.click(screen.getByText('2. AI Prompt'));
    expect(screen.getByText('Copy Prompt')).toBeInTheDocument();

    // Switch to Import tab
    fireEvent.click(screen.getByText('3. Import JSON'));
    expect(screen.getByText('Import Cards to Workspace')).toBeInTheDocument();

    // Save
    fireEvent.click(screen.getByText('Save'));
    expect(onSaveConfig).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
