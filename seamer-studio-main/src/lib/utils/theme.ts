// Shared light/dark theme detection, driven by DaisyUI's `data-theme` on <html>.

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function setTheme(theme: AppTheme, persist = true): AppTheme {
  if (typeof document === 'undefined') return theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }
  return theme;
}

export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Subscribe to theme changes (data-theme attribute or OS scheme). Returns an unsubscribe fn. */
export function onThemeChange(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  mq?.addEventListener?.('change', cb);
  return () => { obs.disconnect(); mq?.removeEventListener?.('change', cb); };
}

/** Flip the app between the DaisyUI 'light' and 'dark' themes (persisted to localStorage). */
export function toggleTheme(): 'light' | 'dark' {
  const next = isDarkTheme() ? 'light' : 'dark';
  return setTheme(next);
}

/** Apply the saved theme, defaulting to light on a first visit. */
export function applyStoredTheme(): AppTheme {
  if (typeof document === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return setTheme(stored, false);
  } catch { /* ignore */ }
  return setTheme('light', false);
}
