import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check, Globe } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { SearchEngineProvider } from '../../types/database';
import { SEARCH_ENGINES } from './types';
import { resolveSearchOrUrl } from './searchUtils';
import { useTranslation } from '../../services/i18n';

export interface BrowserSearchProps {
  className?: string;
  onNavigate?: (url: string) => void;
}

export const BrowserSearch: React.FC<BrowserSearchProps> = ({
  className = '',
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { settings, setSearchEngine } = useSettingsStore();
  const { t } = useTranslation();

  const activeEngine: SearchEngineProvider = settings?.searchEngine || 'google';
  const currentEngineConfig = SEARCH_ENGINES[activeEngine] || SEARCH_ENGINES.google;

  // Keyboard shortcut listener (/ and Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // '/' to focus when not currently typing in an input
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to close engine dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsEngineDropdownOpen(false);
      }
    };

    if (isEngineDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEngineDropdownOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const result = resolveSearchOrUrl(query, activeEngine);
    if (!result || !result.url) return;

    if (onNavigate) {
      onNavigate(result.url);
    } else {
      window.location.href = result.url;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        inputRef.current?.blur();
      }
      setIsEngineDropdownOpen(false);
    }
  };

  const handleSelectEngine = (engine: SearchEngineProvider) => {
    setSearchEngine(engine);
    setIsEngineDropdownOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      role="search"
      aria-label={t('search.ariaLabel') || 'Web Search'}
      className={`relative w-full max-w-2xl mx-auto my-4 transition-all duration-200 ${className}`}
    >
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full bg-card/85 dark:bg-card/70 backdrop-blur-md border border-border/60 hover:border-border/90 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 px-3 py-2"
      >
        {/* Engine Selector Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsEngineDropdownOpen(!isEngineDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label={`${t('search.switchEngine') || 'Switch search engine'}: ${currentEngineConfig.name}`}
            aria-expanded={isEngineDropdownOpen}
          >
            <span className="font-semibold text-foreground text-[13px]">
              {currentEngineConfig.name}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {/* Engine Selector Menu */}
          {isEngineDropdownOpen && (
            <div className="absolute left-0 mt-2 w-44 rounded-xl bg-popover/95 backdrop-blur-lg border border-border shadow-lg z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {t('search.searchEngine') || 'Search Engine'}
              </div>
              {(Object.keys(SEARCH_ENGINES) as SearchEngineProvider[]).map((engineKey) => {
                const engine = SEARCH_ENGINES[engineKey];
                const isSelected = engineKey === activeEngine;
                return (
                  <button
                    key={engineKey}
                    type="button"
                    onClick={() => handleSelectEngine(engineKey)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{engine.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border/60 mx-2" aria-hidden="true" />

        {/* Search Icon */}
        <Search className="h-4 w-4 text-muted-foreground ml-1 mr-2.5 shrink-0" aria-hidden="true" />

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder') || 'Search or enter a website address...'}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none min-w-0"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mr-1"
            aria-label={t('common.clear') || 'Clear'}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Keyboard Shortcut Indicator */}
        {!query && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-muted-foreground/60 px-1.5 py-0.5 rounded border border-border/40 select-none">
            <span>/</span>
          </div>
        )}
      </form>
    </div>
  );
};
