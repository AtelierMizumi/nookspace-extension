import { VocabularyEntity } from '../../types/database';

export type QuestionDirection = 'word-to-meaning' | 'meaning-to-word' | 'mixed';
export type QuestionFormat = 'multiple-choice' | 'fill-in' | 'mixed';

export interface TestConfig {
  questionCount: number; // 5, 10, or -1 (all)
  direction: QuestionDirection;
  format: QuestionFormat;
  reviewOnly?: boolean;
}

export interface TestQuestion {
  id: string;
  cardId: string;
  card: VocabularyEntity;
  direction: 'word-to-meaning' | 'meaning-to-word';
  format: 'multiple-choice' | 'fill-in';
  prompt: string;
  subPrompt?: string;
  correctAnswer: string;
  options?: string[]; // 4 options if multiple choice
  acceptableAnswers: string[];
}

export interface TestAnswerResult {
  questionId: string;
  cardId: string;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  word: string;
  meaning: string;
}

export interface TestSummary {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  durationSeconds: number;
  results: TestAnswerResult[];
  missedCards: VocabularyEntity[];
}

/**
 * Normalizes text for lenient yet accurate answer comparison:
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips trailing punctuation (. ! ?)
 * - Collapses consecutive spaces
 */
export function normalizeAnswer(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?,;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses alternative answers from meaning string (e.g. "học tập / học hành" -> ["học tập", "học hành"]).
 */
export function extractAcceptableAnswers(meaning: string): string[] {
  if (!meaning) return [];
  const normalized = normalizeAnswer(meaning);
  const parts = normalized
    .split(/[/,;()]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const set = new Set<string>([normalized, ...parts]);
  return Array.from(set);
}

/**
 * Evaluates user typed or selected answer against question.
 */
export function evaluateTestAnswer(userAnswer: string, question: TestQuestion): boolean {
  const normUser = normalizeAnswer(userAnswer);
  if (!normUser) return false;

  const normCorrect = normalizeAnswer(question.correctAnswer);
  if (normUser === normCorrect) return true;

  // Check acceptable answers
  for (const acceptable of question.acceptableAnswers) {
    if (normUser === normalizeAnswer(acceptable)) {
      return true;
    }
  }

  return false;
}

/**
 * Generates randomized test questions from available deck vocabulary cards.
 */
export function generateTestQuestions(
  cards: VocabularyEntity[],
  config: TestConfig
): TestQuestion[] {
  if (!cards || cards.length === 0) return [];

  // Filter cards if reviewOnly requested
  let eligibleCards = [...cards];
  if (config.reviewOnly) {
    const reviewCards = eligibleCards.filter(
      (c) => c.status === 'learning' || c.difficultyRating === 'hard'
    );
    if (reviewCards.length > 0) {
      eligibleCards = reviewCards;
    }
  }

  // Shuffle cards
  const shuffled = [...eligibleCards].sort(() => Math.random() - 0.5);

  const count =
    config.questionCount > 0
      ? Math.min(config.questionCount, shuffled.length)
      : shuffled.length;

  const selectedCards = shuffled.slice(0, count);

  return selectedCards.map((card, idx) => {
    // Determine direction for this question
    let dir: 'word-to-meaning' | 'meaning-to-word' = 'word-to-meaning';
    if (config.direction === 'mixed') {
      dir = Math.random() > 0.5 ? 'word-to-meaning' : 'meaning-to-word';
    } else {
      dir = config.direction;
    }

    // Determine format for this question
    let fmt: 'multiple-choice' | 'fill-in' = 'multiple-choice';
    if (config.format === 'mixed') {
      fmt = Math.random() > 0.5 ? 'multiple-choice' : 'fill-in';
    } else {
      fmt = config.format;
    }

    const isWordToMeaning = dir === 'word-to-meaning';
    const prompt = isWordToMeaning ? card.word : card.meaning;
    const subPrompt = isWordToMeaning ? card.reading || card.romanization : undefined;
    const correctAnswer = isWordToMeaning ? card.meaning : card.word;
    const acceptableAnswers = isWordToMeaning
      ? extractAcceptableAnswers(card.meaning)
      : [normalizeAnswer(card.word)];

    let options: string[] | undefined = undefined;

    // Generate 4 multiple-choice options if format is multiple-choice
    if (fmt === 'multiple-choice') {
      const otherCards = cards.filter((c) => c.id !== card.id);
      const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);

      const distractorPool: string[] = [];
      for (const other of shuffledOthers) {
        const candidate = isWordToMeaning ? other.meaning : other.word;
        if (
          candidate &&
          normalizeAnswer(candidate) !== normalizeAnswer(correctAnswer) &&
          !distractorPool.includes(candidate)
        ) {
          distractorPool.push(candidate);
        }
        if (distractorPool.length >= 3) break;
      }

      // If we don't have enough distractors, fallback to fill-in format
      if (distractorPool.length >= 3) {
        options = [correctAnswer, ...distractorPool.slice(0, 3)].sort(
          () => Math.random() - 0.5
        );
      } else {
        fmt = 'fill-in';
      }
    }

    return {
      id: `q-${idx}-${card.id}`,
      cardId: card.id,
      card,
      direction: dir,
      format: fmt,
      prompt,
      subPrompt,
      correctAnswer,
      options,
      acceptableAnswers,
    };
  });
}
