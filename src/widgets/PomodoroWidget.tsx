import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  XCircle,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Timer as TimerIcon,
} from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';
import { usePomodoroStore } from '../features/pomodoro/pomodoroStore';
import { usePomodoroSync } from '../features/pomodoro/usePomodoroSync';
import { PomodoroMode, PomodoroModeConfig } from '../types/pomodoro';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Switch } from '../components/ui/Switch';
import { Input } from '../components/ui/Input';

export const PomodoroWidgetComponent: React.FC<WidgetProps> = () => {
  usePomodoroSync();

  const {
    activeTimerState,
    config,
    isLoading,
    error,
    displayRemainingSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    resetTimer,
    skipTimer,
    switchMode,
    updateConfig,
  } = usePomodoroStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusInput, setFocusInput] = useState(String(config.focusDurationMinutes));
  const [shortBreakInput, setShortBreakInput] = useState(String(config.shortBreakDurationMinutes));
  const [longBreakInput, setLongBreakInput] = useState(String(config.longBreakDurationMinutes));
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled);

  // Format mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentMode = activeTimerState.mode;
  const timerState = activeTimerState.state;
  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isCompleted = timerState === 'completed';
  const isRecovery = timerState === 'recovery_required';

  // Progress percentage
  const totalDurationSeconds =
    (activeTimerState.state === 'running' || activeTimerState.state === 'paused'
      ? activeTimerState.durationMinutes
      : currentMode === 'focus'
      ? config.focusDurationMinutes
      : currentMode === 'shortBreak'
      ? config.shortBreakDurationMinutes
      : config.longBreakDurationMinutes) * 60;

  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalDurationSeconds - displayRemainingSeconds) / totalDurationSeconds) * 100)
  );

  const handleSaveSettings = async () => {
    const focusMins = Math.max(1, Math.min(180, parseInt(focusInput, 10) || 25));
    const shortMins = Math.max(1, Math.min(60, parseInt(shortBreakInput, 10) || 5));
    const longMins = Math.max(1, Math.min(60, parseInt(longBreakInput, 10) || 15));

    await updateConfig({
      focusDurationMinutes: focusMins,
      shortBreakDurationMinutes: shortMins,
      longBreakDurationMinutes: longMins,
      soundEnabled,
    });
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full p-4 bg-surface text-text-primary rounded-xl select-none justify-between">
      {/* Top Bar: Mode Pills & Settings Icon */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1 bg-surface-hover/50 p-1 rounded-lg">
          {(['focus', 'shortBreak', 'longBreak'] as PomodoroMode[]).map((mode) => {
            const isActive = currentMode === mode;
            const label =
              mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';
            return (
              <button
                key={mode}
                disabled={isRunning || isPaused || isRecovery}
                onClick={() => switchMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-active/50 disabled:opacity-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setFocusInput(String(config.focusDurationMinutes));
            setShortBreakInput(String(config.shortBreakDurationMinutes));
            setLongBreakInput(String(config.longBreakDurationMinutes));
            setSoundEnabled(config.soundEnabled);
            setIsSettingsOpen(true);
          }}
          className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
          title="Pomodoro Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Persistence Health Banner if Degraded */}
      {activeTimerState.persistenceHealth !== 'healthy' && !isRecovery && (
        <div className="mb-2 px-2.5 py-1 bg-warning/10 border border-warning/30 rounded-md flex items-center gap-2 text-warning text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Storage connection degraded. Sessions are preserved in memory.</span>
        </div>
      )}

      {/* Main Display: Circular Progress / Countdown */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        {isRecovery ? (
          <div className="flex flex-col items-center text-center p-3 bg-danger/10 border border-danger/30 rounded-xl max-w-xs">
            <AlertTriangle className="w-8 h-8 text-danger mb-2" />
            <h4 className="font-semibold text-sm text-danger mb-1">Recovery Required</h4>
            <p className="text-xs text-text-secondary mb-3">
              {(activeTimerState as any).failureReason || 'Data inconsistency detected.'}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => resetTimer(true)}
              className="text-xs"
            >
              Reset to Clean State
            </Button>
          </div>
        ) : isCompleted ? (
          <div className="flex flex-col items-center text-center py-2 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-success mb-2" />
            <span className="text-lg font-semibold text-text-primary">Session Finished!</span>
            <span className="text-xs text-text-secondary mt-1">
              Next suggested: {activeTimerState.nextSuggestedMode}
            </span>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Countdown Numbers */}
            <div className="text-5xl font-mono font-bold tracking-tight text-text-primary my-1">
              {formatTime(displayRemainingSeconds)}
            </div>

            {/* Subtext: Cycle Count */}
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              <span>
                Cycle {activeTimerState.currentCycleCount} / {config.longBreakInterval}
              </span>
              {isPaused && (
                <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
                  Paused
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {!isRecovery && (
        <div className="flex items-center justify-center gap-3 mt-2">
          {isRunning ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pauseTimer()}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Pause className="w-4 h-4" /> Pause
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTimer()}
                disabled={isLoading}
                className="text-text-secondary hover:text-text-primary"
                title="Skip to next phase"
              >
                <SkipForward className="w-4 h-4" /> Skip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelTimer()}
                disabled={isLoading}
                className="text-text-secondary hover:text-danger"
                title="Cancel session"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          ) : isPaused ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => resumeTimer()}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Play className="w-4 h-4" /> Resume
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTimer()}
                disabled={isLoading}
                className="text-text-secondary hover:text-text-primary"
              >
                <SkipForward className="w-4 h-4" /> Skip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetTimer()}
                disabled={isLoading}
                className="text-text-secondary hover:text-text-primary"
                title="Reset session"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          ) : isCompleted ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => startTimer(activeTimerState.nextSuggestedMode)}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Play className="w-4 h-4" /> Start {activeTimerState.nextSuggestedMode}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetTimer()}
                disabled={isLoading}
              >
                Close
              </Button>
            </div>
          ) : (
            /* Idle State */
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => startTimer(currentMode)}
                disabled={isLoading}
                className="gap-1.5 px-6"
              >
                <Play className="w-4 h-4" /> Start
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetTimer()}
                disabled={isLoading}
                className="text-text-secondary hover:text-text-primary"
                title="Reset cycle count to 1"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Pomodoro Settings"
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Focus (mins)
              </label>
              <Input
                type="number"
                min="1"
                max="180"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Short Break (mins)
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={shortBreakInput}
                onChange={(e) => setShortBreakInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Long Break (mins)
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={longBreakInput}
                onChange={(e) => setLongBreakInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-text-secondary" />
              )}
              <span className="text-sm font-medium text-text-primary">Notification Sound & Alerts</span>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(checked) => setSoundEnabled(checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const PomodoroWidget: WidgetDefinition = {
  type: 'pomodoro',
  name: 'Pomodoro Timer',
  description: 'Structured focus & break cycles to supercharge productivity.',
  category: 'productivity',
  icon: TimerIcon,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 4 },
  minDimensions: { w: 3, h: 3 },
  component: PomodoroWidgetComponent,
};

