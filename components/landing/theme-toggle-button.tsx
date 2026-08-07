'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

// A simple two-state Sun/Moon toggle for the landing header, matching the
// approved mockup exactly. Uses the same next-themes state as the dashboard's
// `ModeToggle` dropdown (components/theme-toggle.tsx), so toggling here stays
// in sync everywhere else in the app — it's just a different control.
export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid rendering theme-dependent icon state before hydration.
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      className="lg-icon-btn"
      aria-label="Changer de thème"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
      <span className="sr-only">Changer de thème</span>
    </button>
  )
}
