import React, { useEffect, useState } from 'react';
import {
  Target,
  Clock,
  Flame,
  CheckSquare,
  CheckCircle2,
  Edit2,
  Save,
  X,
  RotateCcw,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { useDailyGoalsStore } from '../features/daily-goals/dailyGoalsStore';
import { DailyGoalType } from '../types/dailyGoals';
import { Button } from '../components/ui/Button';
import { STORAGE_KEY_LAST_DRAINED_AT } from '../features/pomodoro/storageService';
import { STORAGE_KEY_TODO_LAST_UPDATED_AT } from '../services/database/repositories/todoRepository';
import { useTranslation } from '../services/i18n';

export const DailyGoalsWidgetComponent: React.FC<WidgetProps> = ({ workspaceId }) => {
  const { t } = useTranslation();
  const {
    summary,
    isLoading,
    error,
    isEditing,
    setIsEditing,
    fetchGoals,
    updateTarget,
    resetToDefaults,
  } = useDailyGoalsStore();

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Initial fetch on mount & workspace switch
  useEffect(() => {
    fetchGoals(workspaceId);
  }, [fetchGoals, workspaceId]);

  // Live synchronization:
  // Listens to:
  // 1. STORAGE_KEY_LAST_DRAINED_AT: Pomodoro outbox finishes draining FocusSessions into Dexie.
  // 2. STORAGE_KEY_TODO_LAST_UPDATED_AT: Todo CRUD / status toggle operations persisted in Dexie.
  // Re-calculates daily goal progress strictly after Dexie commits, supporting both current and cross-tab updates.
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
        fetchGoals(workspaceId);
      }
    };

    ext.storage.onChanged.addListener(handleStorageChange);
    return () => {
      ext.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [fetchGoals, workspaceId]);

  // Enter edit mode: prefill inputs with current targets
  const handleStartEditing = () => {
    if (!summary) return;
    const initial: Record<string, string> = {};
    for (const g of summary.goals) {
      initial[g.id] = String(g.targetValue);
    }
    setEditValues(initial);
    setFormError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setFormError(null);
  };

  const handleSaveEditing = async () => {
    if (!summary) return;
    setFormError(null);

    // Validate all inputs before saving
    for (const g of summary.goals) {
      const rawVal = editValues[g.id];
      const parsed = Number(rawVal);
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        setFormError(`"${g.title}" target must be a positive whole number`);
        return;
      }
      if (parsed > 10000) {
        setFormError(`"${g.title}" target cannot exceed 10,000`);
        return;
      }
    }

    try {
      for (const g of summary.goals) {
        const parsed = Number(editValues[g.id]);
        if (parsed !== g.targetValue) {
          await updateTarget(g.id, parsed, workspaceId);
        }
      }
      setIsEditing(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save targets');
    }
  };

  const getGoalIcon = (type: DailyGoalType) => {
    switch (type) {
      case 'focus_time':
        return <Clock className="w-3.5 h-3.5 text-primary" />;
      case 'focus_sessions':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'completed_todos':
        return <CheckSquare className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Target className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 bg-surface text-text-primary rounded-xl select-none justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-sm text-text-primary">
          <Target className="w-4 h-4 text-primary" />
          <span>Daily Goals</span>
        </div>

        <div className="flex items-center gap-1">
          {summary && !isEditing && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                summary.allCompleted
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}
            >
              {summary.overallPercentage}%
            </span>
          )}

          {!isEditing ? (
            <button
              onClick={handleStartEditing}
              title={t('widgets.dailyGoals.editTargets')}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveEditing}
                title={t('widgets.dailyGoals.saveTargets')}
                className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-all"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelEditing}
                title={t('common.cancel')}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
        {isLoading && !summary ? (
          <div className="flex flex-col items-center justify-center py-6 text-text-secondary gap-2 text-xs">
            <RotateCw className="w-4 h-4 animate-spin text-primary" />
            <span>{t('common.loading')}</span>
          </div>
        ) : error && !summary ? (
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-xs text-text-secondary">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchGoals(workspaceId)}>
              {t('widgets.studyTracker.tryAgain')}
            </Button>
          </div>
        ) : !summary || summary.goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-text-secondary">
            <Target className="w-6 h-6 text-text-secondary/40 mb-1" />
            <p className="text-xs">No daily goals configured.</p>
          </div>
        ) : isEditing ? (
          /* Edit Mode Form */
          <div className="flex flex-col gap-2.5 overflow-y-auto px-0.5">
            {formError && (
              <p className="text-[11px] text-red-500 font-medium px-1">{formError}</p>
            )}
            {summary.goals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary truncate">
                  {getGoalIcon(goal.type)}
                  <span className="truncate">{goal.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={editValues[goal.id] ?? goal.targetValue}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    className="w-16 px-1.5 py-0.5 text-xs text-right bg-surface-hover border border-border/60 rounded-md text-text-primary focus:outline-none focus:border-primary"
                  />
                  <span className="text-[11px] text-text-secondary/70 w-8 truncate">
                    {goal.unit}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1 border-t border-border/30">
              <button
                onClick={() => resetToDefaults(workspaceId)}
                className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-text-primary"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('widgets.dailyGoals.resetDefaults')}</span>
              </button>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={handleCancelEditing} className="h-6 text-xs px-2">
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={handleSaveEditing} className="h-6 text-xs px-2">
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Progress View */
          <div className="flex flex-col gap-2.5 justify-center">
            {summary.allCompleted && (
              <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>All daily goals achieved! Great work!</span>
              </div>
            )}

            {summary.goals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    {getGoalIcon(goal.type)}
                    <span className="truncate">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
                    <span className={goal.isCompleted ? 'text-emerald-500 font-semibold' : 'text-text-primary'}>
                      {goal.currentValue}
                    </span>
                    <span className="text-text-secondary">/ {goal.targetValue} {goal.unit}</span>
                    {goal.isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 ml-0.5" />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.isCompleted ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${goal.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between text-[10px] text-text-secondary pt-2 border-t border-border/30">
        <span>
          {summary ? `${summary.completedCount} of ${summary.totalCount} completed` : 'Today'}
        </span>
        <span className="font-mono">{summary?.dateString || ''}</span>
      </div>
    </div>
  );
};

export const DailyGoalsWidget: WidgetDefinition = {
  type: 'daily-goals',
  name: 'Daily Goals',
  description: 'Track daily study and productivity targets with live progress.',
  category: 'productivity',
  icon: Target,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: DailyGoalsWidgetComponent,
};
