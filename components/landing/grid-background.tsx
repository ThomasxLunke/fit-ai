'use client'

import ShapeGrid from '@/components/ShapeGrid'
import { useTheme } from 'next-themes'

// Fixed full-viewport animated grid, sitting behind all landing content.
// Colors track the app's actual dark/light state (next-themes) so it stays
// in sync with the header's theme toggle instead of drifting out of it.
export function GridBackground() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="lg-grid-bg fixed inset-0 -z-10" aria-hidden="true">
      <ShapeGrid
        direction="diagonal"
        speed={0.3}
        squareSize={40}
        shape="square"
        borderColor={isDark ? '#1c222e' : '#e4e8ee'}
        hoverFillColor={
          isDark ? 'rgba(232, 150, 59, 0.16)' : 'rgba(181, 102, 30, 0.1)'
        }
        vignetteColor={isDark ? '#0b0e14' : '#f3f5f8'}
      />
    </div>
  )
}
