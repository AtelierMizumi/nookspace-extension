import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../services/i18n';
import { BrowserSearch } from '../../features/search/BrowserSearch';

export interface WorkspaceHeaderProps {
  userName?: string;
  showSearch?: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  userName = 'Explorer',
  showSearch = true,
}) => {
  const { t, formatDate, formatTime } = useTranslation();
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [greetingKey, setGreetingKey] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        formatTime(now, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDate(
        formatDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      );

      const hour = now.getHours();
      if (hour >= 5 && hour < 12) {
        setGreetingKey('morning');
      } else if (hour >= 12 && hour < 18) {
        setGreetingKey('afternoon');
      } else if (hour >= 18 && hour < 22) {
        setGreetingKey('evening');
      } else {
        setGreetingKey('night');
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [formatDate, formatTime]);

  const greetingText = t(`widgets.greeting.${greetingKey}`) || 'Hello';

  return (
    <div className="w-full flex flex-col items-center justify-center pt-6 pb-2 text-center select-none">
      <div className="text-5xl md:text-6xl font-light tracking-tight font-mono text-foreground tabular-nums mb-1.5">
        {time || '00:00:00'}
      </div>
      <h2 className="text-sm md:text-base font-normal text-foreground/90 tracking-tight">
        {greetingText}, <span className="font-medium text-foreground">{userName}</span>
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{date}</p>

      {/* Central Integrated Web Search Bar */}
      {showSearch && (
        <div className="w-full mt-3">
          <BrowserSearch />
        </div>
      )}
    </div>
  );
};

