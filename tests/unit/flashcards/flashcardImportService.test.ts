import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeAIJsonString,
  importFlashcardsFromText,
} from '../../../src/features/flashcards/flashcardImportService';
import { db } from '../../../src/services/database/db';

describe('Flashcard Import Service & Sanitation', () => {
  beforeEach(async () => {
    await db.vocabulary.clear();
  });

  it('1. sanitizes markdown code fences and extraneous text', () => {
    const raw = `Here is the vocabulary list you requested:
\`\`\`json
{
  "version": 1,
  "sourceLanguage": "Japanese",
  "targetLanguage": "Vietnamese",
  "cards": [
    {
      "word": "勉強",
      "meaning": "Học tập"
    }
  ]
}
\`\`\`
Hope this helps!`;

    const cleaned = sanitizeAIJsonString(raw);
    expect(cleaned.startsWith('{')).toBe(true);
    expect(cleaned.endsWith('}')).toBe(true);
    const parsed = JSON.parse(cleaned);
    expect(parsed.cards[0].word).toBe('勉強');
  });

  it('2. imports valid JSON and persists cards into Dexie vocabulary table', async () => {
    const jsonInput = JSON.stringify({
      version: 1,
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      cards: [
        {
          word: '勉強',
          reading: 'べんきょう',
          romanization: 'benkyou',
          meaning: 'học tập',
          partOfSpeech: 'noun / suru-verb',
          example: '毎日日本語を勉強します。',
          exampleMeaning: 'Tôi học tiếng Nhật mỗi ngày.',
          difficulty: 'beginner',
          topic: 'daily life',
          note: 'Common daily verb',
        },
        {
          word: '本',
          reading: 'ほん',
          romanization: 'hon',
          meaning: 'quyển sách',
          partOfSpeech: 'noun',
        },
      ],
    });

    const res = await importFlashcardsFromText(jsonInput, 'ws-study');
    expect(res.success).toBe(true);
    expect(res.importedCount).toBe(2);
    expect(res.duplicateCount).toBe(0);

    const stored = await db.vocabulary.toArray();
    expect(stored.length).toBe(2);
    const benkyou = stored.find((c) => c.word === '勉強');
    expect(benkyou).toBeDefined();
    expect(benkyou?.sourceLanguage).toBe('Japanese');
    expect(benkyou?.targetLanguage).toBe('Vietnamese');
  });

  it('3. detects duplicate cards and avoids re-inserting them', async () => {
    const jsonInput = JSON.stringify({
      version: 1,
      sourceLanguage: 'Japanese',
      targetLanguage: 'Vietnamese',
      cards: [
        { word: '猫', meaning: 'con mèo' },
        { word: '犬', meaning: 'con chó' },
      ],
    });

    const res1 = await importFlashcardsFromText(jsonInput);
    expect(res1.importedCount).toBe(2);

    // Second import of the same words
    const res2 = await importFlashcardsFromText(jsonInput);
    expect(res2.importedCount).toBe(0);
    expect(res2.duplicateCount).toBe(2);

    const stored = await db.vocabulary.toArray();
    expect(stored.length).toBe(2);
  });

  it('4. rejects invalid JSON syntax and malformed schemas with descriptive errors', async () => {
    const malformed = 'Not valid JSON at all';
    const res1 = await importFlashcardsFromText(malformed);
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Invalid JSON');

    const missingFields = JSON.stringify({
      version: 1,
      sourceLanguage: 'English',
      // Missing targetLanguage and cards
    });
    const res2 = await importFlashcardsFromText(missingFields);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Schema validation failed');
  });
});
