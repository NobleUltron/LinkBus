import React from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
export function ThemeToggle({
  onDark = false


}: {onDark?: boolean;}) {
  const {
    theme,
    toggleTheme
  } = useTheme();
  const isDark = theme === 'dark';
  return <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors duration-150 ease-smooth ${onDark ? 'border-white/15 text-white/80 hover:bg-white/10 hover:text-white' : 'border-line text-muted hover:bg-surface-2 hover:text-fg'}`}>
      {isDark ? <SunIcon className="h-4 w-4" aria-hidden /> : <MoonIcon className="h-4 w-4" aria-hidden />}
    </button>;
}