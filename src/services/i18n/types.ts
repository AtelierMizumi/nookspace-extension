export type SupportedLanguage = 'en' | 'vi';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

export type TranslationParams = Record<string, string | number>;

export type NestedTranslations = {
  [key: string]: string | NestedTranslations;
};
