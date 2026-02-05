'use client';

import { useThemeStore } from '@/store/themeStore';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-lg transition-all duration-200"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        width: '40px',
        height: '40px',
      }}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Toggle theme"
    >
      <Moon
        className="absolute"
        style={{
          width: '18px',
          height: '18px',
          color: 'var(--text-secondary)',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
          transition: 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      <Sun
        className="absolute"
        style={{
          width: '18px',
          height: '18px',
          color: 'var(--text-secondary)',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
          transition: 'opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </button>
  );
}
