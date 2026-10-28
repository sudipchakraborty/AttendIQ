export type ThemeId = 'pearl' | 'graphite' | 'midnight';
export const THEME_KEY = 'attendiq-theme';
/** @brief Theme used on first visit or when browser preferences cannot be read. */
export const DEFAULT_THEME: ThemeId = 'midnight';
export function readTheme(storage: Pick<Storage, 'getItem'>): ThemeId {
  try {
    const value = storage.getItem(THEME_KEY);
    if (value === 'pearl' || value === 'graphite' || value === 'midnight') return value;
  } catch {
    /* Storage may be disabled. */
  }
  return DEFAULT_THEME;
}
export function saveTheme(value: ThemeId, storage: Pick<Storage, 'setItem'>) {
  try {
    storage.setItem(THEME_KEY, value);
  } catch {
    /* Theme still works for this session. */
  }
}
