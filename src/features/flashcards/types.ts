import { z } from 'zod';
import { VocabularyEntity } from '../../types/database';

export type FlashcardLanguage =
  | 'Japanese'
  | 'Vietnamese'
  | 'English'
  | 'Korean'
  | 'Chinese'
  | 'French'
  | 'German'
  | 'Spanish'
  | string;

export const LANGUAGE_PRESETS: string[] = [
  'English',
  'Vietnamese',
  'Japanese',
  'Korean',
  'Chinese',
  'French',
  'German',
  'Spanish',
];

export type FlashcardLevel =
  | 'beginner'
  | 'elementary'
  | 'intermediate'
  | 'advanced'
  | 'custom';

export const LEVEL_OPTIONS: Array<{ id: FlashcardLevel; labelEn: string; labelVi: string }> = [
  { id: 'beginner', labelEn: 'Beginner', labelVi: 'Người mới bắt đầu' },
  { id: 'elementary', labelEn: 'Elementary', labelVi: 'Sơ cấp' },
  { id: 'intermediate', labelEn: 'Intermediate', labelVi: 'Trung cấp' },
  { id: 'advanced', labelEn: 'Advanced', labelVi: 'Nâng cao' },
  { id: 'custom', labelEn: 'Custom Level', labelVi: 'Tùy chỉnh' },
];

export type FlashcardTopic =
  | 'everyday'
  | 'travel'
  | 'business'
  | 'it-programming'
  | 'academic'
  | 'jlpt'
  | 'topik'
  | 'toeic'
  | 'ielts'
  | 'custom';

export const TOPIC_OPTIONS: Array<{ id: FlashcardTopic; labelEn: string; labelVi: string }> = [
  { id: 'everyday', labelEn: 'Everyday Vocabulary', labelVi: 'Giao tiếp hàng ngày' },
  { id: 'travel', labelEn: 'Travel & Tourism', labelVi: 'Du lịch & Khám phá' },
  { id: 'business', labelEn: 'Business & Office', labelVi: 'Kinh doanh & Văn phòng' },
  { id: 'it-programming', labelEn: 'IT & Programming', labelVi: 'Công nghệ & Lập trình' },
  { id: 'academic', labelEn: 'Academic & Science', labelVi: 'Học thuật & Khoa học' },
  { id: 'jlpt', labelEn: 'JLPT (Japanese)', labelVi: 'Luyện thi JLPT (Tiếng Nhật)' },
  { id: 'topik', labelEn: 'TOPIK (Korean)', labelVi: 'Luyện thi TOPIK (Tiếng Hàn)' },
  { id: 'toeic', labelEn: 'TOEIC (English)', labelVi: 'Luyện thi TOEIC (Tiếng Anh)' },
  { id: 'ielts', labelEn: 'IELTS (English)', labelVi: 'Luyện thi IELTS (Tiếng Anh)' },
  { id: 'custom', labelEn: 'Custom Topic', labelVi: 'Chủ đề tùy chọn' },
];

export interface FlashcardPreferences {
  sourceLanguage: string;
  targetLanguage: string;
  explanationLanguage?: string;
  level: FlashcardLevel;
  topic: FlashcardTopic;
  customTopic?: string;
  dailyCount: number;
}

export const DEFAULT_FLASHCARD_PREFERENCES: FlashcardPreferences = {
  sourceLanguage: 'Japanese',
  targetLanguage: 'Vietnamese',
  explanationLanguage: 'Vietnamese',
  level: 'beginner',
  topic: 'everyday',
  dailyCount: 5,
};

// ==========================================
// Zod Validation Schemas for AI Import
// ==========================================

export const FlashcardCardSchema = z.object({
  id: z.string().optional(),
  word: z.string().trim().min(1, 'Word is required'),
  reading: z.string().trim().optional(),
  romanization: z.string().trim().optional(),
  meaning: z.string().trim().min(1, 'Meaning is required'),
  partOfSpeech: z.string().trim().optional(),
  example: z.string().trim().optional(),
  exampleSentence: z.string().trim().optional(),
  exampleMeaning: z.string().trim().optional(),
  exampleTranslation: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  topic: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const FlashcardImportSchema = z.object({
  version: z.number().optional().default(1),
  deckName: z.string().trim().optional(),
  sourceLanguage: z.string().trim().min(1, 'Source language is required'),
  targetLanguage: z.string().trim().min(1, 'Target language is required'),
  expirationHours: z.number().optional().default(24),
  cards: z.array(FlashcardCardSchema).min(1, 'At least one vocabulary card is required'),
});

export type FlashcardImportData = z.infer<typeof FlashcardImportSchema>;
export type FlashcardCardData = z.infer<typeof FlashcardCardSchema>;

export interface ExpirationOption {
  hours: number;
  labelEn: string;
  labelVi: string;
}

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { hours: 24, labelEn: '1 Day (24 hours)', labelVi: '1 Ngày (24 giờ)' },
  { hours: 48, labelEn: '2 Days (48 hours)', labelVi: '2 Ngày (48 giờ)' },
  { hours: 72, labelEn: '3 Days (72 hours)', labelVi: '3 Ngày (72 giờ)' },
  { hours: 168, labelEn: '7 Days (1 week)', labelVi: '7 Ngày (1 tuần)' },
  { hours: 336, labelEn: '14 Days (2 weeks)', labelVi: '14 Ngày (2 tuần)' },
  { hours: 720, labelEn: '30 Days (1 month)', labelVi: '30 Ngày (1 tháng)' },
  { hours: -1, labelEn: 'Never expire', labelVi: 'Không bao giờ hết hạn' },
];

export interface FlashcardDeckMetadata {
  deckId: string;
  deckName: string;
  sourceLanguage: string;
  targetLanguage: string;
  totalCards: number;
  createdAt: number;
  activatedAt: number;
  expiresAt: number | null; // null for never
  expirationHours: number; // default 24
}
