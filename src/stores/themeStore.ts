import { create } from 'zustand';
import { browserApi } from '../services/browser';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  initializeTheme: () => Promise<void>;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: (theme: ThemeMode) => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyThemeToDocument(resolved);

    // Save to local fast cache (for anti-flash)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nookspace_theme_mode', theme);
      localStorage.setItem('nookspace_resolved_theme', resolved);
    }

    // Persist via browser abstraction
    browserApi.storage.local.set({
      nookspace_theme_mode: theme,
      nookspace_resolved_theme: resolved,
    });

    set({ theme, resolvedTheme: resolved });
  },

  initializeTheme: async () => {
    let savedTheme: ThemeMode = 'dark';

    // 1. Check quick localStorage cache first
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('nookspace_theme_mode') as ThemeMode | null;
      if (cached && ['light', 'dark', 'system'].includes(cached)) {
        savedTheme = cached;
      }
    }

    // 2. Fallback to extension storage if available
    try {
      const extStored = await browserApi.storage.local.get<{ nookspace_theme_mode?: ThemeMode }>(
        'nookspace_theme_mode'
      );
      if (extStored?.nookspace_theme_mode) {
        savedTheme = extStored.nookspace_theme_mode;
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }

    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme;
    applyThemeToDocument(resolved);

    // Setup listener for OS system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (get().theme === 'system') {
          const newResolved = getSystemTheme();
          applyThemeToDocument(newResolved);
          set({ resolvedTheme: newResolved });
        }
      });
    }

    // Setup listener for cross-tab theme synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'nookspace_theme_mode' && e.newValue) {
          const newTheme = e.newValue as ThemeMode;
          if (['light', 'dark', 'system'].includes(newTheme)) {
            const newResolved = newTheme === 'system' ? getSystemTheme() : newTheme;
            applyThemeToDocument(newResolved);
            set({ theme: newTheme, resolvedTheme: newResolved });
          }
        }
      });
    }

    set({ theme: savedTheme, resolvedTheme: resolved });
  },
}));
