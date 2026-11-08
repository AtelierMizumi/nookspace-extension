import { describe, it, expect } from 'vitest';
import { MusicWidget } from '../../../src/widgets/MusicWidget';
import { CalendarOverviewWidget } from '../../../src/widgets/CalendarOverviewWidget';
import { PomodoroWidget } from '../../../src/widgets/PomodoroWidget';
import { TodoWidget } from '../../../src/widgets/TodoWidget';
import {
  ClockWidget,
  GreetingWidget,
  QuickLinksWidget,
  SimpleTodoWidget,
  QuickNotesWidget,
  StudyTrackerWidget,
  DailyGoalsWidget,
  SmartBookmarksWidget,
  NotesWidget,
  FlashcardWidget,
} from '../../../src/widgets/index';

const ALL_WIDGETS = [
  MusicWidget,
  CalendarOverviewWidget,
  PomodoroWidget,
  TodoWidget,
  ClockWidget,
  GreetingWidget,
  QuickLinksWidget,
  SimpleTodoWidget,
  QuickNotesWidget,
  StudyTrackerWidget,
  DailyGoalsWidget,
  SmartBookmarksWidget,
  NotesWidget,
  FlashcardWidget,
];

/**
 * Semantic minimums: cards whose content needs real space must not be
 * created/shrunk below usability (music player, calendar, pomodoro, todo).
 */
describe('widget semantic dimension minimums', () => {
  it('music player defaults tall enough for vinyl + seek + controls', () => {
    expect(MusicWidget.defaultDimensions).toEqual({ w: 4, h: 4 });
    expect(MusicWidget.minDimensions).toEqual({ w: 4, h: 4 });
  });

  it('calendar defaults tall enough for month grid + header', () => {
    expect(CalendarOverviewWidget.defaultDimensions).toEqual({ w: 4, h: 4 });
    expect(CalendarOverviewWidget.minDimensions).toEqual({ w: 4, h: 3 });
  });

  it('pomodoro keeps a usable minimum for ring + controls', () => {
    expect(PomodoroWidget.minDimensions).toEqual({ w: 4, h: 4 });
  });

  it('todo list cannot be shrunk to a strip', () => {
    expect(TodoWidget.minDimensions).toEqual({ w: 3, h: 3 });
  });

  it('every registered widget has sane non-zero default/min dimensions', () => {
    expect(ALL_WIDGETS.length).toBeGreaterThanOrEqual(14);
    for (const def of ALL_WIDGETS) {
      expect(def.defaultDimensions.w, `${def.type} default w`).toBeGreaterThanOrEqual(3);
      expect(def.defaultDimensions.h, `${def.type} default h`).toBeGreaterThanOrEqual(2);
      expect(def.minDimensions.w, `${def.type} min w`).toBeGreaterThanOrEqual(2);
      expect(def.minDimensions.h, `${def.type} min h`).toBeGreaterThanOrEqual(2);
      // minima never exceed defaults
      expect(def.minDimensions.w, `${def.type} min w <= default w`).toBeLessThanOrEqual(def.defaultDimensions.w);
      expect(def.minDimensions.h, `${def.type} min h <= default h`).toBeLessThanOrEqual(def.defaultDimensions.h);
    }
  });
});
