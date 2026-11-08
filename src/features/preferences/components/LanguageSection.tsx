import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { useTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../services/i18n';

interface LanguageSectionProps {
  className?: string;
}

export const LanguageSection: React.FC<LanguageSectionProps> = ({ className = '' }) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`} data-testid="language-section">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            {t('preferences.language.title')}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
          {language === 'vi' ? 'Tiếng Việt' : 'English'}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t('preferences.language.description')}
      </p>

      <div
        className="grid grid-cols-2 gap-2.5 pt-1"
        role="radiogroup"
        aria-label={t('preferences.language.title')}
      >
        {SUPPORTED_LANGUAGES.map((option) => {
          const isSelected = language === option.code;
          return (
            <div
              key={option.code}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => setLanguage(option.code)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setLanguage(option.code);
                }
              }}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                  : 'border-border/60 hover:border-border hover:bg-muted/40'
              }`}
              data-testid={`language-option-${option.code}`}
            >
              <div>
                <span className="font-medium text-foreground text-xs block">
                  {option.nativeName}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {option.name}
                </span>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/75 italic pt-0.5">
        {t('preferences.language.localeNote')}
      </p>
    </div>
  );
};
