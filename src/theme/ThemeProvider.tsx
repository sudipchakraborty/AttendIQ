import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from './themes';
import { readTheme, saveTheme } from './preferences';
import type { ThemeId } from './preferences';

const ThemeContext = createContext<{ id: ThemeId; setId: (id: ThemeId) => void } | null>(null);
export function AppThemeProvider({ children }: PropsWithChildren) {
  const [id, setId] = useState<ThemeId>(() => {
    try {
      return readTheme(window.localStorage);
    } catch {
      return 'pearl';
    }
  });
  const theme = useMemo(() => createAppTheme(id), [id]);
  useEffect(() => {
    document.documentElement.dataset.theme = id;
    document.documentElement.style.colorScheme = id === 'pearl' ? 'light' : 'dark';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme.palette.background.default);
    try {
      saveTheme(id, window.localStorage);
    } catch {
      /* Browser storage access can throw. */
    }
  }, [id, theme]);
  return (
    <ThemeContext.Provider value={{ id, setId }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Theme provider missing');
  return context;
}
