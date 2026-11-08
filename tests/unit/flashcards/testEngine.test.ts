import { describe, it, expect } from 'vitest';
import {
  normalizeAnswer,
  extractAcceptableAnswers,
  evaluateTestAnswer,
  generateTestQuestions,
  TestQuestion,
} from '../../../src/features/flashcards/testEngine';
import { VocabularyEntity } from '../../../src/types/database';

describe('Flashcard Vocabulary Test Engine', () => {
  const sampleCards: VocabularyEntity[] = [
    {
      id: 'c1',
      word: '勉強',
      reading: 'べんきょう',
      meaning: 'Học tập / Học hành',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'learning',
      difficultyRating: 'hard',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'c2',
      word: '本',
      reading: 'ほん',
      meaning: 'Quyển sách',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'new',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'c3',
      word: '猫',
      reading: 'ねこ',
      meaning: 'Con mèo',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'mastered',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'c4',
      word: '犬',
      reading: 'いぬ',
      meaning: 'Con chó',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'learning',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'c5',
      word: '車',
      reading: 'くるま',
      meaning: 'Xe hơi',
      category: 'general',
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      status: 'new',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('1. normalizes answer strings accurately', () => {
    expect(normalizeAnswer('  Học tập!  ')).toBe('học tập');
    expect(normalizeAnswer('STUDY.')).toBe('study');
    expect(normalizeAnswer('   ')).toBe('');
  });

  it('2. extracts multiple acceptable answers from slash or comma-separated definitions', () => {
    const answers = extractAcceptableAnswers('Học tập / Học hành, Rèn luyện');
    expect(answers).toContain('học tập');
    expect(answers).toContain('học hành');
    expect(answers).toContain('rèn luyện');
  });

  it('3. evaluates answer with lenient case, whitespace and synonyms', () => {
    const question: TestQuestion = {
      id: 'q-1',
      cardId: 'c1',
      card: sampleCards[0],
      direction: 'word-to-meaning',
      format: 'fill-in',
      prompt: '勉強',
      correctAnswer: 'Học tập / Học hành',
      acceptableAnswers: ['học tập', 'học hành'],
    };

    expect(evaluateTestAnswer('học tập', question)).toBe(true);
    expect(evaluateTestAnswer('  HỌC HÀNH!  ', question)).toBe(true);
    expect(evaluateTestAnswer('quyển sách', question)).toBe(false);
    expect(evaluateTestAnswer('', question)).toBe(false);
  });

  it('4. generates 4-option multiple-choice questions with distinct distractors', () => {
    const questions = generateTestQuestions(sampleCards, {
      questionCount: 3,
      direction: 'word-to-meaning',
      format: 'multiple-choice',
    });

    expect(questions.length).toBe(3);
    for (const q of questions) {
      expect(q.format).toBe('multiple-choice');
      expect(q.options?.length).toBe(4);
      expect(q.options).toContain(q.correctAnswer);
      // Ensure distractors are unique
      const uniqueOptions = new Set(q.options);
      expect(uniqueOptions.size).toBe(4);
    }
  });

  it('5. generates meaning-to-word typed questions', () => {
    const questions = generateTestQuestions(sampleCards, {
      questionCount: 2,
      direction: 'meaning-to-word',
      format: 'fill-in',
    });

    expect(questions.length).toBe(2);
    for (const q of questions) {
      expect(q.direction).toBe('meaning-to-word');
      expect(q.format).toBe('fill-in');
      expect(sampleCards.some((c) => c.meaning === q.prompt)).toBe(true);
      expect(sampleCards.some((c) => c.word === q.correctAnswer)).toBe(true);
    }
  });

  it('6. filters questions to review-only difficult cards when specified', () => {
    const questions = generateTestQuestions(sampleCards, {
      questionCount: 5,
      direction: 'word-to-meaning',
      format: 'multiple-choice',
      reviewOnly: true,
    });

    expect(questions.length).toBe(2);
    const cardIds = questions.map((q) => q.cardId);
    expect(cardIds).toContain('c1');
    expect(cardIds).toContain('c4');
  });
});
