import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../features/widget-system/types';

export const CalendarOverviewWidgetComponent: React.FC<WidgetProps> = () => {
  const now = new Date();
  const currentMonth = now.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const todayDate = now.getDate();

  // Simple current month grid calculation
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }

  const weekLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="h-full flex flex-col justify-between select-none">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-1.5 border-b border-border/40">
        <span className="flex items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          {currentMonth}
        </span>
        <span className="text-[11px] font-mono">Day {todayDate}</span>
      </div>

      {/* Weekdays header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground/70 font-medium py-1">
        {weekLabels.map((lbl) => (
          <span key={lbl}>{lbl}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.slice(0, 28).map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-5 w-5" />;
          }
          const isToday = day === todayDate;
          return (
            <div
              key={`day-${day}`}
              className={`h-5 w-5 mx-auto rounded flex items-center justify-center text-[11px] font-medium ${
                isToday
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'text-foreground/80 hover:bg-secondary/60'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/30">
        Local Agenda
      </div>
    </div>
  );
};

export const CalendarOverviewWidget: WidgetDefinition = {
  type: 'calendar-overview',
  name: 'Calendar Overview',
  description: 'Month glance and current day indicator.',
  category: 'productivity',
  icon: CalendarIcon,
  defaultConfig: {},
  defaultDimensions: { w: 4, h: 3 },
  minDimensions: { w: 3, h: 2 },
  component: CalendarOverviewWidgetComponent,
};
