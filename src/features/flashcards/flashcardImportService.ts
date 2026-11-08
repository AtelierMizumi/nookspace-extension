import { db } from '../../services/database/db';
import { VocabularyEntity } from '../../types/database';
import { FlashcardImportSchema, FlashcardImportData } from './types';
import { flashcardRepository } from './flashcardRepository';

const generateCardId = (): string => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export interface FlashcardImportResult {
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  totalCards: number;
  error?: string;
  importedEntities?: VocabularyEntity[];
}

/**
 * Strips markdown code blocks and excess whitespace from user-pasted AI response.
 */
export function sanitizeAIJsonString(raw: string): string {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find first '{' and last '}' if AI included leading/trailing commentary
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Validates and imports AI-generated vocabulary JSON into local Dexie database.
 */
export async function importFlashcardsFromText(
  rawInput: string,
  workspaceId?: string
): Promise<FlashcardImportResult> {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return {
      success: false,
      importedCount: 0,
      duplicateCount: 0,
      totalCards: 0,
      error: 'Input is empty. Please paste the JSON returned by your AI assistant.',
    };
  }

  const cleaned = sanitizeAIJsonString(rawInput);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      duplicateCount: 0,
      totalCards: 0,
      error: `Invalid JSON syntax: ${err?.message || 'Could not parse response.'}`,
    };
  }

  const parseResult = FlashcardImportSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .slice(0, 3)
      .join('; ');
    return {
      success: false,
      importedCount: 0,
      duplicateCount: 0,
      totalCards: 0,
      error: `Schema validation failed: ${errorDetails}`,
    };
  }

  const data: FlashcardImportData = parseResult.data;
  const now = Date.now();

  // Load existing vocabulary to detect duplicates
  const existingCards = await db.vocabulary.toArray();
  const existingKeys = new Set(
    existingCards.map(
      (c) =>
        `${(c.sourceLanguage || '').toLowerCase()}::${(c.targetLanguage || '').toLowerCase()}::${c.word.toLowerCase().trim()}`
    )
  );

  const entitiesToInsert: VocabularyEntity[] = [];
  let duplicateCount = 0;

  for (const card of data.cards) {
    const key = `${data.sourceLanguage.toLowerCase()}::${data.targetLanguage.toLowerCase()}::${card.word.toLowerCase().trim()}`;
    if (existingKeys.has(key)) {
      duplicateCount++;
      continue;
    }
    existingKeys.add(key);

    const entity: VocabularyEntity = {
      id: card.id || generateCardId(),
      workspaceId,
      word: card.word,
      reading: card.reading,
      romanization: card.romanization,
      meaning: card.meaning,
      partOfSpeech: card.partOfSpeech,
      exampleSentence: card.exampleSentence || card.example,
      exampleTranslation: card.exampleTranslation || card.exampleMeaning,
      category: card.topic || 'general',
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      difficulty: card.difficulty,
      topic: card.topic,
      note: card.note,
      status: 'new',
      difficultyRating: undefined,
      lastReviewedAt: undefined,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    entitiesToInsert.push(entity);
  }

  if (entitiesToInsert.length > 0) {
    await db.vocabulary.bulkAdd(entitiesToInsert);

    // Initialize or update active deck metadata if none exists
    const currentMeta = flashcardRepository.getDeckMetadata(workspaceId);
    if (!currentMeta) {
      const expHours = data.expirationHours !== undefined ? data.expirationHours : 24;
      const expiresAt = expHours === -1 ? null : now + expHours * 3600 * 1000;
      flashcardRepository.saveDeckMetadata(
        {
          deckId: `deck-${now}`,
          deckName: data.deckName || `${data.sourceLanguage} - ${data.targetLanguage}`,
          sourceLanguage: data.sourceLanguage,
          targetLanguage: data.targetLanguage,
          totalCards: entitiesToInsert.length,
          createdAt: now,
          activatedAt: now,
          expiresAt,
          expirationHours: expHours,
        },
        workspaceId
      );
    }
  }

  return {
    success: true,
    importedCount: entitiesToInsert.length,
    duplicateCount,
    totalCards: data.cards.length,
    importedEntities: entitiesToInsert,
  };
}
