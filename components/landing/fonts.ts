import { Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'

// Scoped to the landing page only — the rest of the app keeps Geist
// (see app/layout.tsx). Applying `.variable` on the landing page's root
// element makes these available as CSS vars without affecting other pages.

// Condensed industrial grotesk for headlines. (Big Shoulders Display, used
// in the approved mockup, isn't loadable here: this Next.js version's
// bundled Google Fonts catalog only exports the base "Big Shoulders" family,
// but its font-metrics data only has entries for the Display/Text/Inline/
// Stencil sub-families — the combination 404s at build time. Oswald gives
// the same condensed-uppercase character.)
export const displayFont = Oswald({
  variable: '--font-big-shoulders',
  weight: ['600', '700'],
  subsets: ['latin'],
})

export const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
})

export const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
})

export const landingFontVariables = `${displayFont.variable} ${plexSans.variable} ${plexMono.variable}`
