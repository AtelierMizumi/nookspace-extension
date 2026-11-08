import { db } from '../../services/database/db';
import { VocabularyEntity } from '../../types/database';
import {
  FlashcardDeckMetadata,
  FlashcardCardData,
  FlashcardImportData,
} from './types';

const DECK_STORAGE_PREFIX = 'nookspace_flashcard_deck_';

const generateCardId = (): string => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export class FlashcardRepository {
  /**
   * Retrieves all vocabulary entities, optionally filtered by workspaceId.
   */
  async getAll(workspaceId?: string): Promise<VocabularyEntity[]> {
    const collection = db.vocabulary.toCollection();
    const cards = await collection.toArray();

    if (workspaceId) {
      return cards.filter((c) => !c.workspaceId || c.workspaceId === workspaceId);
    }
    return cards;
  }

  /**
   * Retrieves cards for a specific source and target language pair.
   */
  async getByLanguagePair(
    sourceLanguage: string,
    targetLanguage: string,
    workspaceId?: string
  ): Promise<VocabularyEntity[]> {
    const all = await this.getAll(workspaceId);
    const sLow = sourceLanguage.toLowerCase();
    const tLow = targetLanguage.toLowerCase();

    return all.filter(
      (c) =>
        (c.sourceLanguage || '').toLowerCase() === sLow &&
        (c.targetLanguage || '').toLowerCase() === tLow
    );
  }

  /**
   * Updates learning status, rating, and review count of a card.
   */
  async updateReviewStatus(
    id: string,
    status: 'new' | 'learning' | 'mastered',
    rating?: 'easy' | 'good' | 'hard'
  ): Promise<void> {
    const card = await db.vocabulary.get(id);
    if (!card) return;

    await db.vocabulary.update(id, {
      status,
      difficultyRating: rating || card.difficultyRating,
      lastReviewedAt: Date.now(),
      reviewCount: (card.reviewCount || 0) + 1,
      updatedAt: Date.now(),
    });
  }

  /**
   * Deletes a card by id.
   */
  async delete(id: string): Promise<void> {
    await db.vocabulary.delete(id);
  }

  // ==========================================
  // Deck Metadata & Expiration Management
  // ==========================================

  getStorageKey(workspaceId?: string): string {
    return `${DECK_STORAGE_PREFIX}${workspaceId || 'default'}`;
  }

  /**
   * Retrieves active deck metadata from local storage.
   */
  getDeckMetadata(workspaceId?: string): FlashcardDeckMetadata | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(workspaceId));
      if (!raw) return null;
      return JSON.parse(raw) as FlashcardDeckMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Saves active deck metadata to local storage.
   */
  saveDeckMetadata(metadata: FlashcardDeckMetadata, workspaceId?: string): void {
    try {
      localStorage.setItem(this.getStorageKey(workspaceId), JSON.stringify(metadata));
    } catch {
      // Storage error safeguard
    }
  }

  /**
   * Evaluates if a deck has expired based on timestamp.
   */
  isDeckExpired(metadata: FlashcardDeckMetadata | null): boolean {
    if (!metadata) return false;
    if (metadata.expiresAt === null) return false; // Never expires
    return Date.now() >= metadata.expiresAt;
  }

  /**
   * Returns formatted remaining time or expiration string.
   */
  getRemainingTimeFormatted(metadata: FlashcardDeckMetadata | null, lang: 'en' | 'vi' = 'en'): string {
    if (!metadata) return '';
    if (metadata.expiresAt === null) {
      return lang === 'vi' ? 'Không hết hạn' : 'Never expires';
    }

    const diff = metadata.expiresAt - Date.now();
    if (diff <= 0) {
      return lang === 'vi' ? 'Đã hết hạn' : 'Expired';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days >= 2) {
      return lang === 'vi' ? `Còn lại ${days} ngày` : `${days} days left`;
    }
    if (hours >= 1) {
      return lang === 'vi' ? `Còn lại ${hours} giờ` : `${hours} hours left`;
    }

    const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));
    return lang === 'vi' ? `Còn lại ${minutes} phút` : `${minutes} mins left`;
  }

  /**
   * Replaces current deck atomically:
   * 1. Deletes existing vocabulary cards for this workspace
   * 2. Inserts new cards
   * 3. Creates and persists updated DeckMetadata with expiration calculation
   * 4. Resets daily review cached selections
   */
  async replaceDeck(
    workspaceId: string | undefined,
    deckName: string,
    sourceLanguage: string,
    targetLanguage: string,
    cards: FlashcardCardData[],
    expirationHours: number = 24
  ): Promise<FlashcardDeckMetadata> {
    const now = Date.now();
    const expiresAt =
      expirationHours === -1 ? null : now + expirationHours * 60 * 60 * 1000;

    // Delete existing cards in workspace
    const existing = await this.getAll(workspaceId);
    if (existing.length > 0) {
      await db.vocabulary.bulkDelete(existing.map((c) => c.id));
    }

    // Insert new cards
    const entities: VocabularyEntity[] = cards.map((c) => ({
      id: c.id || generateCardId(),
      workspaceId,
      word: c.word,
      reading: c.reading,
      romanization: c.romanization,
      meaning: c.meaning,
      partOfSpeech: c.partOfSpeech,
      exampleSentence: c.exampleSentence || c.example,
      exampleTranslation: c.exampleTranslation || c.exampleMeaning,
      category: c.topic || 'general',
      sourceLanguage,
      targetLanguage,
      difficulty: c.difficulty,
      topic: c.topic,
      note: c.note,
      status: 'new',
      difficultyRating: undefined,
      lastReviewedAt: undefined,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    }));

    if (entities.length > 0) {
      await db.vocabulary.bulkAdd(entities);
    }

    const metadata: FlashcardDeckMetadata = {
      deckId: `deck-${now}`,
      deckName: deckName || `${sourceLanguage} - ${targetLanguage}`,
      sourceLanguage,
      targetLanguage,
      totalCards: entities.length,
      createdAt: now,
      activatedAt: now,
      expiresAt,
      expirationHours,
    };

    this.saveDeckMetadata(metadata, workspaceId);

    // Clear daily selection cache so new deck cards show immediately
    try {
      localStorage.removeItem(`nookspace_daily_flashcards_${workspaceId || 'default'}`);
    } catch {}

    return metadata;
  }

  /**
   * Deletes current active deck and all its cards.
   */
  async deleteCurrentDeck(workspaceId?: string): Promise<void> {
    const existing = await this.getAll(workspaceId);
    if (existing.length > 0) {
      await db.vocabulary.bulkDelete(existing.map((c) => c.id));
    }
    try {
      localStorage.removeItem(this.getStorageKey(workspaceId));
      localStorage.removeItem(`nookspace_daily_flashcards_${workspaceId || 'default'}`);
    } catch {}
  }

  /**
   * Serializes current deck into downloadable JSON structure.
   */
  async exportCurrentDeck(
    workspaceId?: string,
    sourceLanguage?: string,
    targetLanguage?: string
  ): Promise<FlashcardImportData> {
    let cards = await this.getAll(workspaceId);
    if (sourceLanguage && targetLanguage) {
      const sLow = sourceLanguage.toLowerCase();
      const tLow = targetLanguage.toLowerCase();
      cards = cards.filter(
        (c) =>
          (c.sourceLanguage || '').toLowerCase() === sLow &&
          (c.targetLanguage || '').toLowerCase() === tLow
      );
    }

    const metadata = this.getDeckMetadata(workspaceId);

    return {
      version: 1,
      deckName: metadata?.deckName || `${sourceLanguage || 'Vocabulary'} Deck`,
      sourceLanguage: sourceLanguage || cards[0]?.sourceLanguage || 'Language',
      targetLanguage: targetLanguage || cards[0]?.targetLanguage || 'Language',
      expirationHours: metadata?.expirationHours || 24,
      cards: cards.map((c) => ({
        word: c.word,
        reading: c.reading,
        romanization: c.romanization,
        meaning: c.meaning,
        partOfSpeech: c.partOfSpeech,
        exampleSentence: c.exampleSentence,
        exampleTranslation: c.exampleTranslation,
        difficulty: c.difficulty,
        topic: c.topic,
        note: c.note,
      })),
    };
  }

  /**
   * Helper to trigger a browser file download of JSON text.
   */
  downloadDeckJson(data: FlashcardImportData, filename?: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      filename ||
      `nookspace-deck-${data.sourceLanguage.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const flashcardRepository = new FlashcardRepository();
