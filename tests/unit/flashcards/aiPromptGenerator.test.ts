import { describe, it, expect } from 'vitest';
import { generateFlashcardAIPrompt } from '../../../src/features/flashcards/aiPromptGenerator';
import { DEFAULT_FLASHCARD_PREFERENCES } from '../../../src/features/flashcards/types';

describe('AI Prompt Generator for Flashcards', () => {
  it('1. generates structured prompt for Japanese -> Vietnamese with kanji, kana, and romaji instructions', () => {
    const prompt = generateFlashcardAIPrompt(DEFAULT_FLASHCARD_PREFERENCES);
    expect(prompt).toContain('Japanese');
    expect(prompt).toContain('Vietnamese');
    expect(prompt).toContain('Kanji in "word"');
    expect(prompt).toContain('Hiragana/Katakana');
    expect(prompt).toContain('"cards": [');
  });

  it('2. generates prompt for English -> Vietnamese with IPA pronunciation instructions', () => {
    const prompt = generateFlashcardAIPrompt({
      sourceLanguage: 'English',
      targetLanguage: 'Vietnamese',
      level: 'intermediate',
      topic: 'business',
      dailyCount: 10,
    });
    expect(prompt).toContain('English');
    expect(prompt).toContain('IPA phonetic transcription');
    expect(prompt).toContain('business');
    expect(prompt).toContain('10 vocabulary words');
  });

  it('3. generates prompt for Chinese -> English with Hanzi and Pinyin instructions', () => {
    const prompt = generateFlashcardAIPrompt({
      sourceLanguage: 'Chinese',
      targetLanguage: 'English',
      level: 'elementary',
      topic: 'travel',
      dailyCount: 5,
    });
    expect(prompt).toContain('Chinese');
    expect(prompt).toContain('Hanzi in "word"');
    expect(prompt).toContain('Pinyin with tone marks');
  });

  it('4. supports custom topic in prompt generation', () => {
    const prompt = generateFlashcardAIPrompt({
      sourceLanguage: 'Korean',
      targetLanguage: 'Vietnamese',
      level: 'custom',
      topic: 'custom',
      customTopic: 'K-pop & Entertainment Industry',
      dailyCount: 8,
    });
    expect(prompt).toContain('K-pop & Entertainment Industry');
    expect(prompt).toContain('Korean');
  });
});
