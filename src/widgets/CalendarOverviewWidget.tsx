import React, { useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Grid,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Clock,
  CheckSquare,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { useCalendarTrackerStore } from '../features/calendar-tracker/calendarTrackerStore';
import { Button } from '../components/ui/Button';
import { STORAGE_KEY_LAST_DRAINED_AT } from '../features/pomodoro/storageService';
import { STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../services/database/repositories/todoRepository';
import { useTranslation } from '../services/i18n';

export const CalendarOverviewWidgetComponent: React.FC<WidgetProps> = ({ workspaceId }) => {
  const {
    viewMode,
    currentMonth,
    selectedDateString,
    data,
    isLoading,
    error,
    setViewMode,
    setSelectedDate,
    nextMonth,
    prevMonth,
    goToToday,
    fetchData,
  } = useCalendarTrackerStore();

  // Initial fetch on mount & workspace switch
  useEffect(() => {
    fetchData(workspaceId);
  }, [fetchData, workspaceId]);

  // Live synchronization:
  // Listens to:
  // 1. STORAGE_KEY_LAST_DRAINED_AT: Focus sessions committed to Dexie
  // 2. STORAGE_KEY_TODO_LAST_UPDATED_AT: Todos committed to Dexie
  // Triggers refresh strictly post-commit, supporting both current and cross-tab updates.
  useEffect(() => {
    const ext =
      typeof browser !== 'undefined' && browser.storage?.onChanged
        ? browser
        : typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? chrome
        : null;

    if (!ext) return;

    const handleStorageChange = (changes: Record<string, any>, areaName: string) => {
      if (
        areaName === 'local' &&
        (changes[STORAGE_KEY_LAST_DRAINED_AT] || changes[STORAGE_KEY_TODO_LAST_UPDATED_AT])
      ) {
        fetchData(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [fetchData, workspaceId]);

  const { formatDate, language, t } = useTranslation();

  const monthLabel = formatDate(currentMonth, {
    month: 'short',
    year: 'numeric',
  });

  const weekLabels =
    language === 'vi'
      ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getHeatmapColorClass = (level: number, isSelected: boolean) => {
    switch (level) {
      case 1:
        return 'bg-primary/25 text-text-primary hover:bg-primary/35';
      case 2:
        return 'bg-primary/50 text-text-primary hover:bg-primary/60';
      case 3:
        return 'bg-primary/75 text-primary-foreground hover:bg-primary/85';
      case 4:
        return 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold';
      default:
        return isSelected
          ? 'bg-surface-active text-text-primary'
          : 'text-text-secondary hover:bg-surface-hover/80';
    }
  };

  const selectedActivity = selectedDateString && data?.dayMap ? data.dayMap[selectedDateString] : null;

  return (
    <div className="flex flex-col h-full w-full p-4 bg-surface text-text-primary rounded-xl select-none justify-between overflow-hidden">
      {/* Top Header: Title, Streak Badge, Navigation & View Toggle */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-sm text-text-primary">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>{t('widgets.calendar.studyCalendar')}</span>
        </div>

        {/* Streak Badge */}
        {data && (
          <div className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                data.streaks.currentStreak > 0
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-surface-hover text-text-secondary border-border/40'
              }`}
              title={`${t('widgets.calendar.bestStreakLabel')} ${data.streaks.bestStreak} days${
                data.streaks.isPendingToday ? ' (Pending today)' : ''
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${data.streaks.currentStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-text-secondary'}`} />
              <span>
                {data.streaks.currentStreak}d
                {data.streaks.isPendingToday && ' •'}
              </span>
            </div>

            {/* View Mode Toggle Button */}
            <div className="flex items-center bg-surface-hover/60 p-0.5 rounded-lg border border-border/40">
              <button
                onClick={() => setViewMode('month')}
                title="Month Glance"
                className={`p-1 rounded-md transition-all ${
                  viewMode === 'month'
                    ? 'bg-surface text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                title="Activity Heatmap"
                className={`p-1 rounded-md transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-surface text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between min-h-0 py-1">
        {isLoading && !data ? (
          <div className="flex flex-col items-center justify-center py-6 text-text-secondary gap-2 text-xs">
            <RotateCw className="w-4 h-4 animate-spin text-primary" />
            <span>{t('widgets.calendar.loading')}</span>
          </div>
        ) : error && !data ? (
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-xs text-text-secondary">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchData(workspaceId)}>
              {t('widgets.calendar.tryAgain') || 'Try Again'}
            </Button>
          </div>
        ) : viewMode === 'month' ? (
          /* View 1: Month Glance */
          <div className="flex flex-col justify-between h-full">
            {/* Month Header Switcher */}
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/30">
              <div className="flex items-center gap-1 font-medium">
                <span className="font-semibold">{monthLabel}</span>
                <button
                  onClick={goToToday}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary transition-all ml-1"
                >
                  {t('widgets.calendar.today')}
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={prevMonth}
                  title="Previous Month"
                  className="p-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={nextMonth}
                  title="Next Month"
                  className="p-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekdays row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-text-secondary font-medium py-1">
              {weekLabels.map((lbl) => (
                <span key={lbl}>{lbl}</span>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {data?.monthDays.map((cell, idx) => {
                if (cell.dayNumber === null || cell.dateString === null) {
                  return <div key={`empty-${idx}`} className="h-6 w-6 mx-auto" />;
                }

                const isSelected = selectedDateString === cell.dateString;
                const activity = cell.activity;
                const heatClass = getHeatmapColorClass(activity?.heatmapLevel || 0, isSelected);

                return (
                  <button
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.dateString)}
                    className={`h-6 w-6 mx-auto rounded-md flex flex-col items-center justify-center text-[11px] font-medium transition-all relative ${heatClass} ${
                      cell.isToday
                        ? 'ring-1.5 ring-primary font-bold'
                        : isSelected
                        ? 'ring-1 ring-border shadow-xs'
                        : ''
                    }`}
                  >
                    <span>{cell.dayNumber}</span>
                    {/* Active study indicator dot for Todo-only or non-focus days */}
                    {activity?.isActive && activity.focusMinutes === 0 && (
                      <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* View 2: Activity Heatmap */
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-border/30">
              <span className="text-[11px] font-medium text-text-secondary">{t('widgets.calendar.recentActivity')}</span>
              <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                <span>{t('widgets.calendar.bestStreakLabel')}</span>
                <span className="font-semibold text-text-primary">{data?.streaks.bestStreak || 0}d</span>
              </div>
            </div>

            {/* 7x7 Grid */}
            <div className="grid grid-cols-7 gap-1 py-1">
              {data?.heatmapCells.map((cell) => {
                const isSelected = selectedDateString === cell.dateString;
                const heatClass = getHeatmapColorClass(cell.heatmapLevel, isSelected);

                return (
                  <button
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.dateString)}
                    title={`${cell.dateString}: ${cell.focusMinutes} mins`}
                    className={`h-5 w-5 mx-auto rounded-sm flex items-center justify-center transition-all ${heatClass} ${
                      cell.isToday ? 'ring-1.5 ring-primary font-bold' : isSelected ? 'ring-1 ring-border' : ''
                    }`}
                  >
                    {cell.isActive && cell.focusMinutes === 0 && (
                      <span className="w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-end gap-1.5 text-[9px] text-text-secondary pt-1">
              <span>{t('widgets.calendar.less')}</span>
              <span className="w-2.5 h-2.5 rounded-xs bg-surface-hover/60 border border-border/40" />
              <span className="w-2.5 h-2.5 rounded-xs bg-primary/25" />
              <span className="w-2.5 h-2.5 rounded-xs bg-primary/50" />
              <span className="w-2.5 h-2.5 rounded-xs bg-primary/75" />
              <span className="w-2.5 h-2.5 rounded-xs bg-primary" />
              <span>{t('widgets.calendar.more')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Footer */}
      <div className="flex items-center justify-between text-[10px] text-text-secondary pt-2 border-t border-border/30">
        <div className="flex items-center gap-1 truncate font-mono">
          <span>{selectedDateString || data?.referenceDateString || t('widgets.calendar.today')}</span>
          {selectedActivity?.isActive && (
            <span className="flex items-center gap-0.5 text-emerald-500 font-sans font-medium">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>{t('widgets.calendar.active')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-medium">
          <span className="flex items-center gap-1 text-text-primary" title={t('widgets.calendar.focusTime')}>
            <Clock className="w-3 h-3 text-primary" />
            <span>{selectedActivity?.focusMinutes || 0}m</span>
          </span>
          <span className="flex items-center gap-1 text-text-primary" title={t('widgets.calendar.completedTodos')}>
            <CheckSquare className="w-3 h-3 text-blue-500" />
            <span>{selectedActivity?.completedTodos || 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export const CalendarOverviewWidget: WidgetDefinition = {
  type: 'calendar-overview',
  name: 'Study Calendar',
  description: 'Track study continuity, streaks, and activity history.',
  category: 'productivity',
  icon: CalendarIcon,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: CalendarOverviewWidgetComponent,
};

// Alias export for semantic consistency
export const StudyCalendarWidget = CalendarOverviewWidget;
