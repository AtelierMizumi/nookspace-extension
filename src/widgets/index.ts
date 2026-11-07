import { widgetRegistry } from '../features/widget-system/WidgetRegistry';
import { ClockWidget } from './ClockWidget';
import { GreetingWidget } from './GreetingWidget';
import { CalendarOverviewWidget } from './CalendarOverviewWidget';
import { QuickLinksWidget } from './QuickLinksWidget';
import { SimpleTodoWidget } from './SimpleTodoWidget';
import { TodoWidget } from './TodoWidget';
import { QuickNotesWidget } from './QuickNotesWidget';
import { PomodoroWidget } from './PomodoroWidget';
import { StudyTrackerWidget } from './StudyTrackerWidget';
import { DailyGoalsWidget } from './DailyGoalsWidget';

export function registerInitialWidgets(): void {
  widgetRegistry.register(ClockWidget);
  widgetRegistry.register(GreetingWidget);
  widgetRegistry.register(CalendarOverviewWidget);
  widgetRegistry.register(QuickLinksWidget);
  widgetRegistry.register(SimpleTodoWidget);
  widgetRegistry.register(TodoWidget);
  widgetRegistry.register(QuickNotesWidget);
  widgetRegistry.register(PomodoroWidget);
  widgetRegistry.register(StudyTrackerWidget);
  widgetRegistry.register(DailyGoalsWidget);
}

// Auto-register on import
registerInitialWidgets();

export {
  ClockWidget,
  GreetingWidget,
  CalendarOverviewWidget,
  QuickLinksWidget,
  SimpleTodoWidget,
  TodoWidget,
  QuickNotesWidget,
  PomodoroWidget,
  StudyTrackerWidget,
  DailyGoalsWidget,
};
