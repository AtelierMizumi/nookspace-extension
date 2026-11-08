import { FlashcardPreferences } from './types';

/**
 * Generates an optimized, structured AI prompt for language learning vocabulary generation.
 * Directs the AI to respond strictly with valid JSON conforming to NookSpace's Flashcard schema.
 */
export function generateFlashcardAIPrompt(prefs: FlashcardPreferences): string {
  const count = Math.max(1, Math.min(50, prefs.dailyCount || 10));
  const topicLabel =
    prefs.topic === 'custom' && prefs.customTopic
      ? prefs.customTopic
      : prefs.topic;

  // Language-specific formatting guidance
  let pronunciationGuidance = 'Include accurate pronunciation or phonetic transcription in the "reading" field.';
  if (prefs.sourceLanguage.toLowerCase() === 'japanese') {
    pronunciationGuidance =
      'Provide Kanji in "word", Hiragana/Katakana furigana in "reading", and Hepburn Romaji in "romanization".';
  } else if (prefs.sourceLanguage.toLowerCase() === 'korean') {
    pronunciationGuidance =
      'Provide Hangul in "word", Revised Romanization in "romanization", and phonetic reading in "reading" if irregular.';
  } else if (prefs.sourceLanguage.toLowerCase() === 'chinese') {
    pronunciationGuidance =
      'Provide Simplified/Traditional Hanzi in "word" and Pinyin with tone marks in "reading".';
  } else if (prefs.sourceLanguage.toLowerCase() === 'english') {
    pronunciationGuidance =
      'Provide IPA phonetic transcription in "reading" (e.g., "/ˈstʌdi/").';
  }

  return `You are an expert language teacher and lexicographer.
Generate a high-quality vocabulary study list for a student learning ${prefs.sourceLanguage} translated into ${prefs.targetLanguage}.

STUDENT PREFERENCES:
- Source Language: ${prefs.sourceLanguage}
- Target Language: ${prefs.targetLanguage}
- Learning Level: ${prefs.level}
- Topic/Domain: ${topicLabel}
- Card Count: ${count} vocabulary words

PRONUNCIATION INSTRUCTIONS:
${pronunciationGuidance}

OUTPUT FORMAT REQUIREMENTS:
1. Respond ONLY with a valid, parseable JSON object.
2. Do NOT wrap with conversational preamble or closing text.
3. Use this exact schema:

{
  "version": 1,
  "sourceLanguage": "${prefs.sourceLanguage}",
  "targetLanguage": "${prefs.targetLanguage}",
  "cards": [
    {
      "word": "Vocabulary word in ${prefs.sourceLanguage}",
      "reading": "Pronunciation, kana, pinyin, or IPA",
      "romanization": "Romanized transliteration if applicable",
      "meaning": "Clear, concise definition in ${prefs.targetLanguage}",
      "partOfSpeech": "noun, verb, adjective, etc.",
      "example": "A natural, contextual example sentence in ${prefs.sourceLanguage}",
      "exampleMeaning": "Natural translation of the example sentence in ${prefs.targetLanguage}",
      "difficulty": "${prefs.level}",
      "topic": "${topicLabel}",
      "note": "Helpful usage nuance, grammar note, or mnemonic tip"
    }
  ]
}

Ensure all ${count} vocabulary cards are practical, natural, and accurately translated.`;
}
