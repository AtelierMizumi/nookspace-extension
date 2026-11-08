import React from 'react';
import { Search, Check } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { useSettingsStore } from '../../../stores/settingsStore';
import { SearchEngineProvider } from '../../../types/database';
import { SEARCH_ENGINES } from '../../search/types';
import { useTranslation } from '../../../services/i18n';

interface SearchEngineSectionProps {
  className?: string;
}

export const SearchEngineSection: React.FC<SearchEngineSectionProps> = ({
  className = '',
}) => {
  const { settings, setSearchEngine } = useSettingsStore();
  const { t } = useTranslation();

  const activeEngine: SearchEngineProvider = settings?.searchEngine || 'google';

  const providers: {
    id: SearchEngineProvider;
    name: string;
    description: string;
    domain: string;
  }[] = [
    {
      id: 'google',
      name: 'Google',
      description: t('preferences.searchEngine.googleDesc') || 'Google Web Search (Default)',
      domain: 'google.com',
    },
    {
      id: 'bing',
      name: 'Bing',
      description: t('preferences.searchEngine.bingDesc') || 'Microsoft Bing Search',
      domain: 'bing.com',
    },
    {
      id: 'duckduckgo',
      name: 'DuckDuckGo',
      description: t('preferences.searchEngine.ddgDesc') || 'Privacy-focused search engine',
      domain: 'duckduckgo.com',
    },
  ];

  return (
    <div className={`space-y-3 ${className}`} data-testid="search-engine-section">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            {t('preferences.searchEngine.title') || 'Search Engine'}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
          {SEARCH_ENGINES[activeEngine]?.name || 'Google'}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t('preferences.searchEngine.description') ||
          'Choose the default search engine for the integrated Dashboard search bar.'}
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1"
        role="radiogroup"
        aria-label={t('preferences.searchEngine.title') || 'Search Engine'}
      >
        {providers.map((provider) => {
          const isSelected = activeEngine === provider.id;
          return (
            <div
              key={provider.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => setSearchEngine(provider.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setSearchEngine(provider.id);
                }
              }}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40'
                  : 'border-border/60 hover:border-border hover:bg-muted/40'
              }`}
              data-testid={`search-engine-option-${provider.id}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-foreground text-xs block">
                  {provider.name}
                </span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight block">
                {provider.description}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60 mt-1 block">
                {provider.domain}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/70 italic pt-1">
        {t('preferences.searchEngine.privacyNote') ||
          'Search queries are sent only when you press Enter to submit. NookSpace does not log search history.'}
      </p>
    </div>
  );
};
