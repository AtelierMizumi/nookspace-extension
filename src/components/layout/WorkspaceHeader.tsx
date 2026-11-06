import React, { useState, useEffect } from 'react';

export interface WorkspaceHeaderProps {
  userName?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  userName = 'Explorer',
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Hello');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      );

      const hour = now.getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good morning');
      } else if (hour >= 12 && hour < 18) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center pt-8 pb-4 text-center select-none">
      <div className="text-5xl md:text-6xl font-light tracking-tight font-mono text-foreground tabular-nums mb-1.5">
        {time || '00:00:00'}
      </div>
      <h2 className="text-sm md:text-base font-normal text-foreground/90 tracking-tight">
        {greeting}, <span className="font-medium text-foreground">{userName}</span>
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
    </div>
  );
};
