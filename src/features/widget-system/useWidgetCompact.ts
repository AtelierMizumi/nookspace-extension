import { RefObject, useEffect, useState } from 'react';

/**
 * Returns true when a widget's container shrinks below a usable height,
 * so the widget can switch to a compact layout (smaller disc/cells,
 * hidden secondary lines) instead of being crushed by the grid.
 * Falls back to non-compact when ResizeObserver is unavailable (SSR/JSdom).
 */
export function useWidgetCompact<T extends HTMLElement>(
  ref: RefObject<T | null>,
  thresholdPx = 300
): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    setCompact(el.getBoundingClientRect().height < thresholdPx);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCompact(entry.contentRect.height < thresholdPx);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, thresholdPx]);

  return compact;
}
