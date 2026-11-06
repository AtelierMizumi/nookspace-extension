import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Clock, Globe, ShieldCheck } from 'lucide-react';
import { browserApi } from '../../src/services/browser';

export const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [platform, setPlatform] = useState<string>('Detecting...');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    browserApi.runtime.getPlatform().then((plat) => {
      setPlatform(plat);
    });

    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between p-8 selection:bg-neutral-700 selection:text-white">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold tracking-tight shadow-sm">
            N
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              NookSpace <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">v0.1.0-alpha</span>
            </h1>
            <p className="text-xs text-muted-foreground">Your Space. Your Workflow.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-secondary transition-colors text-foreground"
          >
            {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </header>

      {/* Main Focus Area */}
      <section className="flex-1 flex flex-col items-center justify-center my-12 text-center">
        <div className="mb-2 text-6xl md:text-7xl font-extralight tracking-tight font-mono text-foreground">
          {currentTime || '00:00:00'}
        </div>
        <p className="text-muted-foreground text-sm md:text-base font-normal tracking-wide mb-8">
          {currentDate}
        </p>

        {/* Status Verification Card */}
        <div className="w-full max-w-xl p-6 rounded-xl border border-border bg-card text-left shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Phase 0 Foundation Active & Verified
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>WXT & React 18 LTS Pipeline</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Minimal Permissions (3 total)</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground">
              <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Browser Layer: {platform}</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground">
              <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Deterministic Timer Engine</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
            Ready for Phase 1 Design System & Layout Engine integration.
          </p>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer className="text-center text-xs text-muted-foreground border-t border-border pt-4">
        Local-first & Privacy-first • Cross-browser productivity workspace for Chromium & Firefox
      </footer>
    </main>
  );
};
