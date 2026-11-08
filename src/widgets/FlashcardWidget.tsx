import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Languages,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  PlayCircle,
  Award,
  ArrowRight,
  XCircle,
  FileText,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps, WidgetSettingsProps } from '../features/widget-system/types';
import { Button, IconButton } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { useTranslation } from '../services/i18n';
import { VocabularyEntity } from '../types/database';
import {
  FlashcardPreferences,
  DEFAULT_FLASHCARD_PREFERENCES,
  LANGUAGE_PRESETS,
  LEVEL_OPTIONS,
  TOPIC_OPTIONS,
  EXPIRATION_OPTIONS,
  FlashcardLevel,
  FlashcardTopic,
  FlashcardDeckMetadata,
  FlashcardImportData,
  FlashcardImportSchema,
} from '../features/flashcards/types';
import { generateFlashcardAIPrompt } from '../features/flashcards/aiPromptGenerator';
import {
  importFlashcardsFromText,
  sanitizeAIJsonString,
} from '../features/flashcards/flashcardImportService';
import { flashcardRepository } from '../features/flashcards/flashcardRepository';
import { selectDailyFlashcards, getLocalDateString } from '../features/flashcards/dailySelectionEngine';
import {
  generateTestQuestions,
  evaluateTestAnswer,
  TestQuestion,
  TestConfig,
  TestSummary,
  TestAnswerResult,
} from '../features/flashcards/testEngine';

export interface FlashcardWidgetConfig {
  preferences?: FlashcardPreferences;
  expirationHours?: number; // default: 24
}

// ==========================================
// Settings Sub-Component
// ==========================================

export const FlashcardWidgetSettings: React.FC<WidgetSettingsProps<FlashcardWidgetConfig>> = ({
  workspaceId,
  config,
  onSaveConfig,
  onClose,
}) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'preferences' | 'prompt' | 'import'>('preferences');
  const [preferences, setPreferences] = useState<FlashcardPreferences>(
    config?.preferences || DEFAULT_FLASHCARD_PREFERENCES
  );
  const [expirationHours, setExpirationHours] = useState<number>(
    config?.expirationHours !== undefined ? config.expirationHours : 24
  );

  // Deck metadata
  const [deckMetadata, setDeckMetadata] = useState<FlashcardDeckMetadata | null>(null);

  // Custom prompt & import states
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    const meta = flashcardRepository.getDeckMetadata(workspaceId);
    setDeckMetadata(meta);
  }, [workspaceId]);

  useEffect(() => {
    setGeneratedPrompt(generateFlashcardAIPrompt(preferences));
  }, [preferences]);

  // Live parsed cards preview
  const parsedPreview = useMemo(() => {
    if (!importJson.trim()) return null;
    try {
      const cleaned = sanitizeAIJsonString(importJson);
      const parsed = JSON.parse(cleaned);
      const res = FlashcardImportSchema.safeParse(parsed);
      if (res.success) {
        return {
          valid: true,
          count: res.data.cards.length,
          sourceLanguage: res.data.sourceLanguage,
          targetLanguage: res.data.targetLanguage,
          deckName: res.data.deckName,
          data: res.data,
        };
      }
    } catch {}
    return null;
  }, [importJson]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleImportAppend = async () => {
    setIsImporting(true);
    setImportResult(null);

    const res = await importFlashcardsFromText(importJson, workspaceId);
    setIsImporting(false);

    if (res.success) {
      setImportResult({
        success: true,
        message: `Imported ${res.importedCount} new cards (${res.duplicateCount} duplicates skipped).`,
      });
      setImportJson('');
      setDeckMetadata(flashcardRepository.getDeckMetadata(workspaceId));
    } else {
      setImportResult({
        success: false,
        message: res.error || 'Import failed. Check JSON format.',
      });
    }
  };

  const handleConfirmReplaceDeck = async () => {
    if (!parsedPreview?.data) return;
    setIsImporting(true);
    try {
      const newMeta = await flashcardRepository.replaceDeck(
        workspaceId,
        parsedPreview.data.deckName || `${parsedPreview.data.sourceLanguage} - ${parsedPreview.data.targetLanguage}`,
        parsedPreview.data.sourceLanguage,
        parsedPreview.data.targetLanguage,
        parsedPreview.data.cards,
        expirationHours
      );
      setDeckMetadata(newMeta);
      setImportResult({
        success: true,
        message: `Successfully replaced active deck with ${parsedPreview.data.cards.length} cards.`,
      });
      setImportJson('');
      setConfirmReplaceOpen(false);
    } catch (err: any) {
      setImportResult({
        success: false,
        message: `Replace failed: ${err?.message || 'Error occurred'}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteDeck = async () => {
    await flashcardRepository.deleteCurrentDeck(workspaceId);
    setDeckMetadata(null);
    setConfirmDeleteOpen(false);
    setImportResult({
      success: true,
      message: 'Active deck deleted.',
    });
  };

  const handleExportDeck = async () => {
    const data = await flashcardRepository.exportCurrentDeck(
      workspaceId,
      preferences.sourceLanguage,
      preferences.targetLanguage
    );
    flashcardRepository.downloadDeckJson(
      data,
      `nookspace-deck-${preferences.sourceLanguage.toLowerCase()}-${Date.now()}.json`
    );
  };

  const handleSave = () => {
    onSaveConfig({
      preferences,
      expirationHours,
    });
    onClose();
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Tab Navigation */}
      <div className="flex border-b border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'preferences'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('widgets.flashcards.tabPreferences') || '1. Preferences'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          className={`px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'prompt'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('widgets.flashcards.tabPrompt') || '2. AI Prompt'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`px-3 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'import'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('widgets.flashcards.tabImport') || '3. Import JSON'}
        </button>
      </div>

      {/* Tab 1: Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-3">
          {/* Source and Target Languages */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-foreground block mb-1">
                {t('widgets.flashcards.sourceLang') || 'Source Language (Learning)'}
              </label>
              <select
                value={preferences.sourceLanguage}
                onChange={(e) =>
                  setPreferences({ ...preferences, sourceLanguage: e.target.value })
                }
                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LANGUAGE_PRESETS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">
                {t('widgets.flashcards.targetLang') || 'Target Language (Meaning)'}
              </label>
              <select
                value={preferences.targetLanguage}
                onChange={(e) =>
                  setPreferences({ ...preferences, targetLanguage: e.target.value })
                }
                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LANGUAGE_PRESETS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Level and Topic */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-foreground block mb-1">
                {t('widgets.flashcards.level') || 'Difficulty Level'}
              </label>
              <select
                value={preferences.level}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    level: e.target.value as FlashcardLevel,
                  })
                }
                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {language === 'vi' ? lvl.labelVi : lvl.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">
                {t('widgets.flashcards.topic') || 'Learning Topic'}
              </label>
              <select
                value={preferences.topic}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    topic: e.target.value as FlashcardTopic,
                  })
                }
                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TOPIC_OPTIONS.map((top) => (
                  <option key={top.id} value={top.id}>
                    {language === 'vi' ? top.labelVi : top.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily Card Count */}
          <div>
            <label className="font-medium text-foreground block mb-1">
              {t('widgets.flashcards.dailyCount') || 'Daily Card Target'}
            </label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPreferences({ ...preferences, dailyCount: count })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    preferences.dailyCount === count
                      ? 'border-primary bg-primary text-primary-foreground font-semibold'
                      : 'border-border/60 hover:bg-secondary/60 text-foreground'
                  }`}
                >
                  {count} {t('widgets.flashcards.cards') || 'cards'}
                </button>
              ))}
            </div>
          </div>

          {/* Expiration Duration */}
          <div>
            <label className="font-medium text-foreground block mb-1">
              {t('widgets.flashcards.expiration') || 'Expiration Duration'}
            </label>
            <select
              value={expirationHours}
              onChange={(e) => setExpirationHours(Number(e.target.value))}
              className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.hours} value={opt.hours}>
                  {language === 'vi' ? opt.labelVi : opt.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tab 2: AI Prompt */}
      {activeTab === 'prompt' && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('widgets.flashcards.promptDesc') ||
              'Copy this prompt, send it to ChatGPT, Claude, or Gemini, then paste the returned JSON in the Import tab.'}
          </p>

          <div className="relative">
            <textarea
              readOnly
              value={generatedPrompt}
              rows={8}
              className="w-full p-2.5 rounded-lg border border-border bg-muted/30 font-mono text-[10px] text-foreground focus:outline-none resize-none leading-relaxed"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyPrompt}
              leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              className="absolute right-2 top-2 h-7 text-xs"
            >
              {copied ? (t('common.copied') || 'Copied') : (t('widgets.flashcards.copyPrompt') || 'Copy Prompt')}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Import JSON & Deck Management */}
      {activeTab === 'import' && (
        <div className="space-y-3">
          {/* Active Deck Info Banner */}
          {deckMetadata && (
            <div className="p-2.5 rounded-lg border border-border/70 bg-secondary/30 flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>{deckMetadata.deckName}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {deckMetadata.totalCards} {t('widgets.flashcards.cards')} •{' '}
                  {flashcardRepository.getRemainingTimeFormatted(deckMetadata, language as 'en' | 'vi')}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportDeck}
                  leftIcon={<Download className="h-3 w-3" />}
                  className="h-6 text-[10px] px-2"
                >
                  {t('widgets.flashcards.exportDeck')}
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label={t('widgets.flashcards.deleteDeck')}
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </IconButton>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('widgets.flashcards.importDesc') ||
              'Paste the raw JSON response from your AI assistant below.'}
          </p>

          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="Paste JSON here (e.g. { version: 1, sourceLanguage: ..., cards: [...] })..."
            rows={6}
            className="w-full p-2.5 rounded-lg border border-border bg-card font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
          />

          {/* Live parsed preview badge */}
          {parsedPreview && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                {t('widgets.flashcards.previewCards', { count: String(parsedPreview.count) }) ||
                  `Preview: ${parsedPreview.count} cards detected (${parsedPreview.sourceLanguage} → ${parsedPreview.targetLanguage})`}
              </span>
            </div>
          )}

          {importResult && (
            <div
              className={`flex items-center gap-2 p-2 rounded-lg text-[11px] ${
                importResult.success
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {importResult.success ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="leading-snug">{importResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportAppend}
              disabled={!importJson.trim() || isImporting}
              className="h-8 text-xs font-semibold"
            >
              {isImporting
                ? t('common.loading') || 'Importing...'
                : t('widgets.flashcards.importCardsBtn') || 'Import Cards to Workspace'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmReplaceOpen(true)}
              disabled={!parsedPreview?.valid || isImporting}
              leftIcon={<RefreshCw className="h-3 w-3" />}
              className="h-8 text-xs font-semibold"
            >
              {t('widgets.flashcards.replaceDeck') || 'Replace Current Deck'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Replace Deck */}
      <Modal
        isOpen={confirmReplaceOpen}
        onClose={() => setConfirmReplaceOpen(false)}
        title={t('widgets.flashcards.replaceDeck') || 'Replace Current Deck'}
        description={
          t('widgets.flashcards.replaceDeckConfirm') ||
          'Replace current deck with new vocabulary cards? This will reset your study session for this deck.'
        }
      >
        <div className="space-y-3 pt-2">
          {parsedPreview && (
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">{t('widgets.flashcards.totalCards')}:</span>{' '}
                <span className="font-semibold text-foreground">{parsedPreview.count}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('widgets.flashcards.expiration')}:</span>{' '}
                <span className="font-semibold text-foreground">
                  {expirationHours === -1 ? t('widgets.flashcards.neverExpires') : `${expirationHours}h`}
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmReplaceOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmReplaceDeck}>
              {t('widgets.flashcards.replaceDeck')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Delete Deck */}
      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={t('widgets.flashcards.deleteDeck') || 'Delete Deck'}
        description={
          t('widgets.flashcards.deleteDeckConfirm') ||
          'Are you sure you want to delete this deck? All active cards in this deck will be removed.'
        }
      >
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDeleteDeck} className="bg-destructive hover:bg-destructive/90 text-white">
            {t('widgets.flashcards.deleteDeck')}
          </Button>
        </div>
      </Modal>

      {/* Action Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} className="h-7 text-xs">
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
};

// ==========================================
// Main Flashcard Widget Component
// ==========================================

export const FlashcardWidgetComponent: React.FC<WidgetProps<FlashcardWidgetConfig>> = ({
  workspaceId,
  config,
  onUpdateConfig,
}) => {
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<'study' | 'test'>('study');
  const [cards, setCards] = useState<VocabularyEntity[]>([]);
  const [deckMetadata, setDeckMetadata] = useState<FlashcardDeckMetadata | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reviewedCardIds, setReviewedCardIds] = useState<Set<string>>(new Set());

  // Test mode state machine: 'config' | 'testing' | 'result'
  const [testState, setTestState] = useState<'config' | 'testing' | 'result'>('config');
  const [testConfig, setTestConfig] = useState<TestConfig>({
    questionCount: 5,
    direction: 'word-to-meaning',
    format: 'multiple-choice',
    reviewOnly: false,
  });
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);
  const [testUserAnswer, setTestUserAnswer] = useState('');
  const [testFeedback, setTestFeedback] = useState<{
    answered: boolean;
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  const [testResults, setTestResults] = useState<TestAnswerResult[]>([]);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [testDurationSeconds, setTestDurationSeconds] = useState<number>(0);

  const preferences = config?.preferences || DEFAULT_FLASHCARD_PREFERENCES;
  const todayDate = getLocalDateString();

  // Load deck metadata and cards
  const loadCards = useCallback(async () => {
    const meta = flashcardRepository.getDeckMetadata(workspaceId);
    setDeckMetadata(meta);

    const all = await flashcardRepository.getByLanguagePair(
      preferences.sourceLanguage,
      preferences.targetLanguage,
      workspaceId
    );

    // If deck has expired, cards are treated as expired
    const isExpired = flashcardRepository.isDeckExpired(meta);
    if (isExpired) {
      setCards([]);
    } else {
      const daily = selectDailyFlashcards(all, preferences.dailyCount, workspaceId, todayDate);
      setCards(daily);
    }

    setCurrentIndex(0);
    setIsFlipped(false);
  }, [preferences.sourceLanguage, preferences.targetLanguage, preferences.dailyCount, workspaceId, todayDate]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const isDeckExpired = useMemo(() => {
    return flashcardRepository.isDeckExpired(deckMetadata);
  }, [deckMetadata]);

  const currentCard = cards[currentIndex] || null;

  // Study Mode navigation
  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleRateCard = async (status: 'learning' | 'mastered', rating: 'easy' | 'good' | 'hard') => {
    if (!currentCard) return;

    await flashcardRepository.updateReviewStatus(currentCard.id, status, rating);
    setReviewedCardIds((prev) => new Set(prev).add(currentCard.id));

    setTimeout(() => {
      handleNext();
    }, 200);
  };

  // Keyboard navigation for Study Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || mode !== 'study') return;
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, cards.length, mode]);

  // ==========================================
  // Test Mode Actions
  // ==========================================

  const handleStartTest = async () => {
    const all = await flashcardRepository.getByLanguagePair(
      preferences.sourceLanguage,
      preferences.targetLanguage,
      workspaceId
    );
    const questions = generateTestQuestions(all, testConfig);
    if (questions.length === 0) return;

    setTestQuestions(questions);
    setTestQuestionIndex(0);
    setTestUserAnswer('');
    setTestFeedback(null);
    setTestResults([]);
    setTestStartTime(Date.now());
    setTestState('testing');
  };

  const handleSelectOptionAnswer = (option: string) => {
    if (testFeedback?.answered) return;
    submitAnswer(option);
  };

  const submitAnswer = async (answer: string) => {
    const currentQ = testQuestions[testQuestionIndex];
    if (!currentQ) return;

    const isCorrect = evaluateTestAnswer(answer, currentQ);
    setTestFeedback({
      answered: true,
      isCorrect,
      correctAnswer: currentQ.correctAnswer,
    });

    const resultItem: TestAnswerResult = {
      questionId: currentQ.id,
      cardId: currentQ.cardId,
      userAnswer: answer,
      isCorrect,
      correctAnswer: currentQ.correctAnswer,
      word: currentQ.card.word,
      meaning: currentQ.card.meaning,
    };
    setTestResults((prev) => [...prev, resultItem]);

    // Update vocabulary mastery in local database
    if (isCorrect) {
      await flashcardRepository.updateReviewStatus(currentQ.cardId, 'mastered', 'good');
    } else {
      await flashcardRepository.updateReviewStatus(currentQ.cardId, 'learning', 'hard');
    }
  };

  const handleNextTestQuestion = () => {
    if (testQuestionIndex + 1 < testQuestions.length) {
      setTestQuestionIndex((prev) => prev + 1);
      setTestUserAnswer('');
      setTestFeedback(null);
    } else {
      // Completed test
      const durationSec = Math.round((Date.now() - testStartTime) / 1000);
      setTestDurationSeconds(durationSec);
      setTestState('result');
    }
  };

  const handleRetakeTest = () => {
    handleStartTest();
  };

  const handleReviewMissedWords = async () => {
    const missedCardIds = new Set(testResults.filter((r) => !r.isCorrect).map((r) => r.cardId));
    const all = await flashcardRepository.getByLanguagePair(
      preferences.sourceLanguage,
      preferences.targetLanguage,
      workspaceId
    );
    const missedCards = all.filter((c) => missedCardIds.has(c.id));
    const questions = generateTestQuestions(missedCards, {
      ...testConfig,
      questionCount: -1,
    });
    if (questions.length > 0) {
      setTestQuestions(questions);
      setTestQuestionIndex(0);
      setTestUserAnswer('');
      setTestFeedback(null);
      setTestResults([]);
      setTestStartTime(Date.now());
      setTestState('testing');
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-between text-xs select-none p-1">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">
            {t('widgets.flashcards.title') || 'Flashcards'}
          </span>
          <Badge variant="outline" size="sm" className="text-[10px] font-medium py-0">
            {preferences.sourceLanguage} → {preferences.targetLanguage}
          </Badge>
          {deckMetadata && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-medium ${
                isDeckExpired
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-border/60 bg-secondary/50 text-muted-foreground'
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              <span>{flashcardRepository.getRemainingTimeFormatted(deckMetadata, language as 'en' | 'vi')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switcher: Study vs Test */}
          <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 border border-border/50">
            <button
              type="button"
              onClick={() => setMode('study')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                mode === 'study'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('widgets.flashcards.studyMode') || 'Study'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('test');
                setTestState('config');
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                mode === 'test'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('widgets.flashcards.testMode') || 'Test'}
            </button>
          </div>

          <Tooltip content={t('common.edit')} position="bottom">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('common.edit')}
              onClick={() => setIsSettingsOpen(true)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* 2. Body: Study Mode vs Test Mode */}
      {mode === 'study' ? (
        // STUDY MODE
        isDeckExpired ? (
          // Expired Deck State
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/5">
            <Clock className="h-8 w-8 text-destructive/70 mb-2 animate-pulse" />
            <div className="font-semibold text-foreground text-xs mb-1">
              {t('widgets.flashcards.deckExpiredTitle') || 'Deck Expired'}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mb-3 leading-relaxed">
              {t('widgets.flashcards.deckExpiredDesc') ||
                'The active learning period for this vocabulary deck has expired. Replace or renew your deck to continue.'}
            </p>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<RefreshCw className="h-3 w-3" />}
              onClick={() => setIsSettingsOpen(true)}
              className="h-7 text-xs"
            >
              {t('widgets.flashcards.replaceDeck') || 'Replace Deck'}
            </Button>
          </div>
        ) : cards.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-2 rounded-xl border border-dashed border-border/70 bg-card/40">
            <Languages className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <div className="font-semibold text-foreground text-xs mb-1">
              {t('widgets.flashcards.noCardsTitle') || 'No Vocabulary Cards Yet'}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-[220px] mb-3 leading-relaxed">
              {t('widgets.flashcards.noCardsDesc') ||
                'Generate AI vocabulary for this language pair and import it in Settings.'}
            </p>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Sparkles className="h-3 w-3" />}
              onClick={() => setIsSettingsOpen(true)}
              className="h-7 text-xs"
            >
              {t('widgets.flashcards.setupAiPrompt') || 'Generate AI Cards'}
            </Button>
          </div>
        ) : currentCard ? (
          // Active Study Card Presentation
          <div className="flex-1 flex flex-col justify-between my-2">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex-1 flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 shadow-sm cursor-pointer transition-all duration-200 relative overflow-hidden group"
            >
              {/* Top Indicator Row */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="capitalize font-medium">
                  {isFlipped ? t('widgets.flashcards.backLabel') || 'Answer' : t('widgets.flashcards.frontLabel') || 'Question'}
                </span>
                <div className="flex items-center gap-1.5">
                  {currentCard.partOfSpeech && (
                    <span className="italic text-muted-foreground/80">
                      {currentCard.partOfSpeech}
                    </span>
                  )}
                  {reviewedCardIds.has(currentCard.id) && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* Core Card Content */}
              <div className="flex-1 flex flex-col items-center justify-center text-center my-2 space-y-1.5">
                {!isFlipped ? (
                  // FRONT OF CARD
                  <>
                    <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                      {currentCard.word}
                    </div>
                    {currentCard.reading && (
                      <div className="text-xs font-medium text-primary/90">
                        {currentCard.reading}
                      </div>
                    )}
                    {currentCard.romanization && (
                      <div className="text-[11px] text-muted-foreground italic font-mono">
                        {currentCard.romanization}
                      </div>
                    )}
                  </>
                ) : (
                  // BACK OF CARD
                  <div className="w-full text-center space-y-2">
                    <div className="text-base sm:text-lg font-bold text-foreground">
                      {currentCard.meaning}
                    </div>
                    {currentCard.exampleSentence && (
                      <div className="pt-1.5 border-t border-border/40 text-[11px]">
                        <div className="text-foreground font-medium leading-snug">
                          {currentCard.exampleSentence}
                        </div>
                        {currentCard.exampleTranslation && (
                          <div className="text-muted-foreground mt-0.5 leading-snug italic">
                            {currentCard.exampleTranslation}
                          </div>
                        )}
                      </div>
                    )}
                    {currentCard.note && (
                      <div className="text-[10px] text-primary/80 bg-primary/5 p-1 rounded">
                        💡 {currentCard.note}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Flip Action Hint */}
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground">
                <RotateCw className="h-3 w-3" />
                <span>{t('widgets.flashcards.clickToFlip') || 'Click to flip'}</span>
              </div>
            </div>

            {/* Rating Buttons (When Flipped) */}
            {isFlipped && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40 animate-in fade-in duration-150">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRateCard('learning', 'hard')}
                  className="flex-1 h-7 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
                >
                  {t('widgets.flashcards.needReview') || 'Difficult'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRateCard('learning', 'good')}
                  className="flex-1 h-7 text-[11px] text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30"
                >
                  {t('widgets.flashcards.good') || 'Good'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRateCard('mastered', 'easy')}
                  className="flex-1 h-7 text-[11px] text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                >
                  {t('widgets.flashcards.known') || 'Known'}
                </Button>
              </div>
            )}
          </div>
        ) : null
      ) : (
        // TEST MODE
        <div className="flex-1 flex flex-col justify-between my-2">
          {testState === 'config' && (
            <div className="flex-1 flex flex-col justify-between p-3 rounded-xl border border-border/70 bg-card">
              <div>
                <div className="font-semibold text-foreground text-xs mb-2 flex items-center gap-1.5">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  <span>{t('widgets.flashcards.testConfigTitle') || 'Test Configuration'}</span>
                </div>

                <div className="space-y-2.5">
                  {/* Question Count */}
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('widgets.flashcards.questionCount') || 'Question Count'}
                    </label>
                    <div className="flex gap-1.5">
                      {[5, 10, -1].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setTestConfig({ ...testConfig, questionCount: count })}
                          className={`flex-1 py-1 rounded-md text-xs font-medium border transition-colors ${
                            testConfig.questionCount === count
                              ? 'border-primary bg-primary text-primary-foreground font-semibold'
                              : 'border-border/60 hover:bg-secondary/60 text-foreground'
                          }`}
                        >
                          {count === -1 ? (t('widgets.flashcards.allCards') || 'All') : count}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('widgets.flashcards.questionDirection') || 'Question Direction'}
                    </label>
                    <select
                      value={testConfig.direction}
                      onChange={(e) =>
                        setTestConfig({
                          ...testConfig,
                          direction: e.target.value as any,
                        })
                      }
                      className="w-full h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="word-to-meaning">
                        {t('widgets.flashcards.wordToMeaning') || 'Word → Meaning'}
                      </option>
                      <option value="meaning-to-word">
                        {t('widgets.flashcards.meaningToWord') || 'Meaning → Word'}
                      </option>
                      <option value="mixed">{t('widgets.flashcards.mixed') || 'Mixed'}</option>
                    </select>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('widgets.flashcards.questionFormat') || 'Question Format'}
                    </label>
                    <select
                      value={testConfig.format}
                      onChange={(e) =>
                        setTestConfig({
                          ...testConfig,
                          format: e.target.value as any,
                        })
                      }
                      className="w-full h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="multiple-choice">
                        {t('widgets.flashcards.multipleChoice') || 'Multiple Choice (4 Options)'}
                      </option>
                      <option value="fill-in">
                        {t('widgets.flashcards.fillIn') || 'Fill in Answer (Type)'}
                      </option>
                      <option value="mixed">{t('widgets.flashcards.mixed') || 'Mixed'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={handleStartTest}
                leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                className="w-full h-8 text-xs font-semibold mt-3"
              >
                {t('widgets.flashcards.startTest') || 'Start Test'}
              </Button>
            </div>
          )}

          {testState === 'testing' && testQuestions[testQuestionIndex] && (
            <div className="flex-1 flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card">
              {/* Question Progress Header */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                <span>
                  {t('widgets.flashcards.questionProgress', {
                    current: String(testQuestionIndex + 1),
                    total: String(testQuestions.length),
                  }) || `Question ${testQuestionIndex + 1} of ${testQuestions.length}`}
                </span>
                <span className="capitalize text-[10px] font-medium text-primary">
                  {testQuestions[testQuestionIndex].format === 'multiple-choice'
                    ? t('widgets.flashcards.multipleChoice')
                    : t('widgets.flashcards.fillIn')}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${((testQuestionIndex + 1) / testQuestions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question Prompt */}
              <div className="text-center my-auto py-2">
                <div className="text-lg sm:text-xl font-bold text-foreground">
                  {testQuestions[testQuestionIndex].prompt}
                </div>
                {testQuestions[testQuestionIndex].subPrompt && (
                  <div className="text-xs text-primary/90 mt-1 font-medium">
                    {testQuestions[testQuestionIndex].subPrompt}
                  </div>
                )}
              </div>

              {/* Options or Typed Input */}
              <div className="mt-2 space-y-2">
                {testQuestions[testQuestionIndex].format === 'multiple-choice' &&
                testQuestions[testQuestionIndex].options ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {testQuestions[testQuestionIndex].options!.map((opt, optIdx) => {
                      const isSelected = testFeedback?.answered && testResults[testQuestionIndex]?.userAnswer === opt;
                      const isCorrect = testFeedback?.answered && opt === testQuestions[testQuestionIndex].correctAnswer;
                      let btnStyle = 'border-border/60 hover:bg-secondary/60 text-foreground';

                      if (testFeedback?.answered) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={testFeedback?.answered}
                          onClick={() => handleSelectOptionAnswer(opt)}
                          className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${btnStyle}`}
                        >
                          <span className="truncate">{opt}</span>
                          {testFeedback?.answered && isCorrect && (
                            <Check className="h-3 w-3 text-emerald-500 shrink-0 ml-1" />
                          )}
                          {testFeedback?.answered && isSelected && !isCorrect && (
                            <XCircle className="h-3 w-3 text-rose-500 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Typed Fill-in Input
                  <div className="flex gap-1.5">
                    <Input
                      placeholder={t('widgets.flashcards.typeAnswerPlaceholder') || 'Type your answer here...'}
                      value={testUserAnswer}
                      disabled={testFeedback?.answered}
                      onChange={(e) => setTestUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !testFeedback?.answered && testUserAnswer.trim()) {
                          submitAnswer(testUserAnswer);
                        }
                      }}
                      className="text-xs h-8 flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!testUserAnswer.trim() || testFeedback?.answered}
                      onClick={() => submitAnswer(testUserAnswer)}
                      className="h-8 text-xs px-3"
                    >
                      {t('widgets.flashcards.submitAnswer') || 'Submit'}
                    </Button>
                  </div>
                )}

                {/* Instant Feedback Banner */}
                {testFeedback && (
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg text-[11px] animate-in fade-in duration-150 ${
                      testFeedback.isCorrect
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {testFeedback.isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate">
                        {testFeedback.isCorrect
                          ? t('widgets.flashcards.correct') || 'Correct!'
                          : `${t('widgets.flashcards.incorrect')}. ${t('widgets.flashcards.correctAnswerIs', { answer: testFeedback.correctAnswer })}`}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleNextTestQuestion}
                      rightIcon={<ArrowRight className="h-3 w-3" />}
                      className="h-6 text-[10px] px-2 shrink-0 ml-2"
                    >
                      {testQuestionIndex + 1 < testQuestions.length
                        ? t('widgets.flashcards.nextQuestion') || 'Next'
                        : t('common.done') || 'Finish'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {testState === 'result' && (
            <div className="flex-1 flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card overflow-y-auto">
              <div>
                <div className="text-center py-2">
                  <div className="inline-flex p-2 rounded-full bg-primary/10 text-primary mb-1.5">
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {t('widgets.flashcards.testCompleted') || 'Test Completed!'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {t('widgets.flashcards.duration')}: {testDurationSeconds}s
                  </div>
                </div>

                {/* Score & Accuracy Card */}
                {(() => {
                  const correctCount = testResults.filter((r) => r.isCorrect).length;
                  const total = testResults.length;
                  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                  const missed = testResults.filter((r) => !r.isCorrect);

                  return (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
                          <div className="text-[10px] text-muted-foreground">{t('widgets.flashcards.score')}</div>
                          <div className="text-sm font-bold text-foreground">
                            {correctCount} / {total}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border/50">
                          <div className="text-[10px] text-muted-foreground">{t('widgets.flashcards.accuracy')}</div>
                          <div className="text-sm font-bold text-primary">{accuracy}%</div>
                        </div>
                      </div>

                      {/* Missed words list */}
                      {missed.length > 0 && (
                        <div className="pt-2 border-t border-border/40">
                          <div className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center justify-between">
                            <span>{t('widgets.flashcards.missedWordsTitle') || 'Words to Review'}</span>
                            <span className="text-rose-500">{missed.length}</span>
                          </div>
                          <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                            {missed.map((m, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-1.5 rounded-md bg-secondary/30 text-[10px]"
                              >
                                <span className="font-semibold text-foreground">{m.word}</span>
                                <span className="text-muted-foreground truncate max-w-[140px] text-right">
                                  {m.meaning}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-border/40 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetakeTest}
                  leftIcon={<RefreshCw className="h-3 w-3" />}
                  className="flex-1 h-7 text-xs"
                >
                  {t('widgets.flashcards.retakeTest') || 'Retake Test'}
                </Button>
                {testResults.some((r) => !r.isCorrect) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleReviewMissedWords}
                    className="flex-1 h-7 text-xs"
                  >
                    {t('widgets.flashcards.reviewMissed') || 'Review Missed'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setMode('study')}
                  className="flex-1 h-7 text-xs"
                >
                  {t('widgets.flashcards.backToStudy') || 'Back to Cards'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Navigation & Progress Footer for Study Mode */}
      {mode === 'study' && cards.length > 0 && !isDeckExpired && (
        <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <span>
              {currentIndex + 1} / {cards.length}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span>
              {Math.round((reviewedCardIds.size / cards.length) * 100)}% {t('widgets.flashcards.reviewed') || 'reviewed'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              variant="outline"
              aria-label={t('common.back') || 'Previous Card'}
              onClick={handlePrev}
              disabled={cards.length <= 1}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-3 w-3" />
            </IconButton>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFlipped(!isFlipped)}
              className="h-6 px-2 text-[10px]"
            >
              <RotateCw className="h-3 w-3 mr-1" />
              {isFlipped ? t('widgets.flashcards.showFront') || 'Front' : t('widgets.flashcards.showBack') || 'Flip'}
            </Button>

            <IconButton
              size="sm"
              variant="outline"
              aria-label={t('common.next') || 'Next Card'}
              onClick={handleNext}
              disabled={cards.length <= 1}
              className="h-6 w-6"
            >
              <ChevronRight className="h-3 w-3" />
            </IconButton>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t('widgets.flashcards.settingsTitle') || 'Flashcard Learning Settings'}
        description={
          t('widgets.flashcards.settingsDesc') ||
          'Configure your study language pair, generate AI vocabulary, and import cards.'
        }
      >
        <FlashcardWidgetSettings
          workspaceId={workspaceId}
          config={config}
          onSaveConfig={(updated) => {
            onUpdateConfig(updated);
            loadCards();
            setIsSettingsOpen(false);
          }}
          onClose={() => {
            loadCards();
            setIsSettingsOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export const FlashcardWidget: WidgetDefinition<FlashcardWidgetConfig> = {
  type: 'flashcards',
  name: 'Flashcards',
  description: 'AI-assisted daily vocabulary learning flashcards across arbitrary language pairs.',
  category: 'productivity',
  icon: BookOpen,
  defaultConfig: {
    preferences: DEFAULT_FLASHCARD_PREFERENCES,
    expirationHours: 24,
  },
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 3, h: 3 },
  component: FlashcardWidgetComponent,
  settingsComponent: FlashcardWidgetSettings,
};
