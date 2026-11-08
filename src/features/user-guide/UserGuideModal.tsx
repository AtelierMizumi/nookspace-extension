import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Rocket,
  LayoutGrid,
  Timer,
  FileText,
  Bookmark,
  Layers,
  Palette,
  Search,
  Music,
  Database,
  Globe,
  HelpCircle,
  X,
  ChevronRight,
  Info,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  LifeBuoy,
} from 'lucide-react';
import { Button, IconButton } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from '../../services/i18n';
import { USER_GUIDE_SECTIONS, UserGuideSection, UserGuideTopic } from './userGuideData';

export interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialSectionId,
}) => {
  const { t, language } = useTranslation();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialSectionId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const isVi = language === 'vi';

  // Keyboard navigation & accessibility focus trap
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  // Section icon mapping
  const renderSectionIcon = (iconName: string, className = 'h-4 w-4') => {
    switch (iconName) {
      case 'Rocket':
        return <Rocket className={className} />;
      case 'LayoutGrid':
        return <LayoutGrid className={className} />;
      case 'Timer':
        return <Timer className={className} />;
      case 'FileText':
        return <FileText className={className} />;
      case 'Bookmark':
        return <Bookmark className={className} />;
      case 'Layers':
        return <Layers className={className} />;
      case 'Palette':
        return <Palette className={className} />;
      case 'Search':
        return <Search className={className} />;
      case 'Music':
        return <Music className={className} />;
      case 'Database':
        return <Database className={className} />;
      case 'Globe':
        return <Globe className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'LifeBuoy':
        return <LifeBuoy className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // Search filter across topics
  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      if (!selectedSectionId) return USER_GUIDE_SECTIONS;
      return USER_GUIDE_SECTIONS.filter((s) => s.id === selectedSectionId);
    }

    return USER_GUIDE_SECTIONS.map((section) => {
      const matchingTopics = section.topics.filter((topic) => {
        const title = (isVi ? topic.titleVi : topic.titleEn).toLowerCase();
        const summary = (isVi ? topic.summaryVi : topic.summaryEn).toLowerCase();
        const steps = (isVi ? topic.stepsVi : topic.stepsEn).join(' ').toLowerCase();
        const tips = (isVi ? topic.tipsVi : topic.tipsEn)?.toLowerCase() || '';

        return (
          title.includes(q) ||
          summary.includes(q) ||
          steps.includes(q) ||
          tips.includes(q)
        );
      });

      return {
        ...section,
        topics: matchingTopics,
      };
    }).filter((s) => s.topics.length > 0);
  }, [searchQuery, selectedSectionId, isVi]);

  const totalTopicsCount = useMemo(() => {
    return USER_GUIDE_SECTIONS.reduce((acc, s) => acc + s.topics.length, 0);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('userGuide.title')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden text-card-foreground select-none"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-card/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                <span>{t('userGuide.title')}</span>
                <Badge variant="secondary" size="sm" className="text-[10px] uppercase font-semibold">
                  v0.1.0
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t('userGuide.subtitle')}
              </p>
            </div>
          </div>

          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t('common.close')}
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Search & Filter Header Toolbar */}
        <div className="px-5 py-3 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={t('userGuide.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs w-full bg-background/80"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Body Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-56 sm:w-64 border-r border-border/60 bg-muted/10 p-3 overflow-y-auto space-y-1 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSectionId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedSectionId === null && !searchQuery
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('userGuide.allTopics')}</span>
              </div>
              <Badge variant="outline" size="sm" className="text-[10px] ml-1">
                {totalTopicsCount}
              </Badge>
            </button>

            <div className="pt-2 pb-1 px-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('userGuide.tableOfContents')}
            </div>

            {USER_GUIDE_SECTIONS.map((section) => {
              const isActive = selectedSectionId === section.id && !searchQuery;
              const title = isVi ? section.titleVi : section.titleEn;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {renderSectionIcon(section.iconName, 'h-4 w-4 shrink-0')}
                    <span className="truncate">{title}</span>
                  </div>
                  <span className="text-[10px] opacity-70 ml-1 shrink-0">
                    {section.topics.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Pane */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">{t('userGuide.noResults')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs"
                >
                  {t('common.clear')}
                </Button>
              </div>
            ) : (
              filteredSections.map((section) => {
                const sectionTitle = isVi ? section.titleVi : section.titleEn;
                const sectionDesc = isVi ? section.descriptionVi : section.descriptionEn;

                return (
                  <div key={section.id} className="space-y-4">
                    {/* Section Header */}
                    <div className="pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2 text-primary font-bold text-base sm:text-lg">
                        {renderSectionIcon(section.iconName, 'h-5 w-5')}
                        <h3>{sectionTitle}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{sectionDesc}</p>
                    </div>

                    {/* Section Topics */}
                    <div className="space-y-4">
                      {section.topics.map((topic) => {
                        const topicTitle = isVi ? topic.titleVi : topic.titleEn;
                        const topicSummary = isVi ? topic.summaryVi : topic.summaryEn;
                        const steps = isVi ? topic.stepsVi : topic.stepsEn;
                        const tips = isVi ? topic.tipsVi : topic.tipsEn;

                        return (
                          <div
                            key={topic.id}
                            className="p-4 rounded-xl border border-border/60 bg-card/40 hover:border-border transition-colors space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                {topicTitle}
                              </h4>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {topicSummary}
                            </p>

                            {/* Steps List */}
                            {steps && steps.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-semibold text-foreground block">
                                  {t('userGuide.stepsLabel')}
                                </span>
                                <ol className="space-y-1 text-xs text-muted-foreground pl-1">
                                  {steps.map((step, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="h-4 w-4 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <span className="leading-snug">{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {/* Shortcuts */}
                            {topic.shortcuts && topic.shortcuts.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
                                <span className="text-[11px] font-semibold text-foreground">
                                  {t('userGuide.quickShortcuts')}:
                                </span>
                                {topic.shortcuts.map((sc, scIdx) => (
                                  <div key={scIdx} className="flex items-center gap-1.5 text-xs">
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded font-mono shadow-xs text-foreground font-semibold">
                                      {sc.key}
                                    </kbd>
                                    <span className="text-[11px] text-muted-foreground">
                                      ({isVi ? sc.descriptionVi : sc.descriptionEn})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tips Callout */}
                            {tips && (
                              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-primary mr-1">
                                    {t('userGuide.tipsLabel')}:
                                  </span>
                                  <span className="text-muted-foreground">{tips}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="px-5 py-3 border-t border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            {t('userGuide.pressEscHint') || 'Press Esc to close'}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs px-4 ml-auto"
          >
            {t('userGuide.backToDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
};
