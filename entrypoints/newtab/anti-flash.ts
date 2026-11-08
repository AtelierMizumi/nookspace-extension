// Anti-flash theme loader — executes synchronously to set dark/light class
(function () {
  try {
    const mode = localStorage.getItem('nookspace_theme_mode') || 'dark';
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  } catch {
    document.documentElement.classList.add('dark');
  }
})();
