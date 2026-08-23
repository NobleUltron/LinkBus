import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
type Theme = 'light' | 'dark';
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'linkbus_theme';
export function ThemeProvider({
  children


}: {children: React.ReactNode;}) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {

      /* ignore */}
    return 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {

      /* ignore */}
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  }, []);
  const value = useMemo(() => ({
    theme,
    toggleTheme
  }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}