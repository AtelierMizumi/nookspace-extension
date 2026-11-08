import React, { useEffect } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart2,
  Calendar,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { useStudyTrackerStore } from '../features/study-tracker/studyTrackerStore';
import { StudyTimeRange } from '../types/studyTracker';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../services/i18n';

import { STORAGE_KEY_LAST_DRAINED_AT } from '../features/pomodoro/storageService';

export const StudyTrackerWidgetComponent: React.FC<WidgetProps> = ({ workspaceId }) => {
  const { t } = useTranslation();
  const { stats, timeRange, isLoading, error, setTimeRange, fetchStats } = useStudyTrackerStore();

  useEffect(() => {
    fetchStats(workspaceId);
  }, [fetchStats, workspaceId]);

  // Live Study Tracker Synchronization:
  // When a Focus session is completed by Pomodoro, the outbox service drains and persists
  // the FocusSession into Dexie, then updates STORAGE_KEY_LAST_DRAINED_AT in browser.storage.
  // We listen to changes on this key so we only re-fetch AFTER Dexie insertion has completed,
  // preventing race conditions where fetchStats() runs before the record is persisted.
  useEffect(() => {
    const ext =
      typeof browser !== 'undefined' && browser.storage?.onChanged
        ? browser
        : typeof chrome !== 'undefined' && chrome.storage?.onChanged
        ? chrome
        : null;

    if (!ext) return;

    const handleStorageChange = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY_LAST_DRAINED_AT]) {
        fetchStats(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [fetchStats, workspaceId]);

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const maxDailyMinutes = stats
    ? Math.max(1, ...stats.activityHistory.map((d) => d.focusMinutes))
    : 60;

  return (
    <div className="flex flex-col h-full w-full p-4 bg-surface text-text-primary rounded-xl select-none justify-between overflow-hidden">
      {/* Top Header: Title & Time Range Switcher */}
      <div className="flex items-center justify-between gap-1 mb-3">
        <div className="flex items-center gap-1.5 font-semibold text-sm text-text-primary">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>{t('widgets.studyTracker.title')}</span>
        </div>

        <div className="flex items-center gap-1 bg-surface-hover/50 p-0.5 rounded-lg text-xs">
          {(['7D', '14D', '30D'] as StudyTimeRange[]).map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range, workspaceId)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-active/50'
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body */}
      {error ? (
        <div className="flex flex-col items-center justify-center my-auto p-4 bg-danger/10 border border-danger/30 rounded-xl text-center">
          <AlertCircle className="w-6 h-6 text-danger mb-2" />
          <span className="text-xs text-danger mb-2">{error}</span>
          <Button size="sm" variant="outline" onClick={() => fetchStats(workspaceId)}>
            {t('widgets.studyTracker.tryAgain')}
          </Button>
        </div>
      ) : isLoading && !stats ? (
        <div className="flex flex-col items-center justify-center my-auto py-6 text-text-secondary">
          <RotateCw className="w-6 h-6 animate-spin text-primary mb-2" />
          <span className="text-xs">Loading study activity...</span>
        </div>
      ) : !stats || stats.completedSessions === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center my-auto py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-2 text-text-secondary">
            <Calendar className="w-6 h-6 text-text-secondary/70" />
          </div>
          <span className="text-sm font-medium text-text-primary mb-1">No Study Activity Yet</span>
          <p className="text-xs text-text-secondary max-w-[220px]">
            Complete a Pomodoro focus session to start tracking your study habits and momentum.
          </p>
        </div>
      ) : (
        /* Data Display */
        <div className="flex flex-col flex-1 justify-between gap-3">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col p-2 bg-surface-hover/60 rounded-lg">
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" /> Focus Time
              </span>
              <span className="text-base font-bold text-text-primary mt-0.5 tabular-nums">
                {formatHoursMinutes(stats.totalFocusMinutes)}
              </span>
            </div>

            <div className="flex flex-col p-2 bg-surface-hover/60 rounded-lg">
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" /> Sessions
              </span>
              <span className="text-base font-bold text-text-primary mt-0.5 tabular-nums">
                {stats.completedSessions}
              </span>
            </div>

            <div className="flex flex-col p-2 bg-surface-hover/60 rounded-lg">
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-warning" /> Avg Length
              </span>
              <span className="text-base font-bold text-text-primary mt-0.5 tabular-nums">
                {stats.averageSessionMinutes}m
              </span>
            </div>
          </div>

          {/* Bar Chart Activity Visualization */}
          <div className="flex flex-col mt-1">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Activity Trend</span>
              <span className="tabular-nums font-mono text-[11px]">
                Today: {formatHoursMinutes(stats.todayFocusMinutes)} ({stats.todayCompletedSessions}{' '}
                sessions)
              </span>
            </div>

            {/* Bars container */}
            <div className="flex items-end justify-between gap-1.5 h-20 pt-2 border-b border-border/40">
              {stats.activityHistory.map((point) => {
                const heightPercent =
                  point.focusMinutes > 0
                    ? Math.max(12, Math.round((point.focusMinutes / maxDailyMinutes) * 100))
                    : 4;

                const isToday =
                  point.dateString ===
                  new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={point.dateString}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:flex px-1.5 py-0.5 bg-neutral-900 text-white text-[10px] rounded shadow whitespace-nowrap z-20 pointer-events-none">
                      {point.dateString}: {point.focusMinutes}m ({point.completedSessions} sessions)
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[14px] rounded-t transition-all ${
                        point.focusMinutes > 0
                          ? isToday
                            ? 'bg-primary'
                            : 'bg-primary/70 hover:bg-primary'
                          : 'bg-surface-hover hover:bg-surface-active'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Labels beneath bars (only show sample labels if range is wide) */}
            <div className="flex justify-between text-[10px] text-text-secondary mt-1">
              <span>{stats.activityHistory[0]?.dayLabel || ''}</span>
              {stats.activityHistory.length > 7 && (
                <span>
                  {stats.activityHistory[Math.floor(stats.activityHistory.length / 2)]?.dayLabel ||
                    ''}
                </span>
              )}
              <span>{stats.activityHistory[stats.activityHistory.length - 1]?.dayLabel || 'Today'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StudyTrackerWidget: WidgetDefinition = {
  type: 'study-tracker',
  name: 'Study Tracker',
  description: 'Visualize your focus sessions, study activity trends, and daily momentum.',
  category: 'productivity',
  icon: BookOpen,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 3, h: 3 },
  component: StudyTrackerWidgetComponent,
};
