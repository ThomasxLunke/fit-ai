export type CtaLink = { label: string; href: string }
export type LandingCta = { primary: CtaLink; secondary: CtaLink | null }

export function resolveLandingCta(
  user: { onboarded: boolean } | null,
): LandingCta {
  if (!user)
    return {
      primary: { label: 'Créer un compte', href: '/sign-up' },
      secondary: { label: 'Se connecter', href: '/sign-in' },
    }

  if (!user.onboarded)
    return {
      primary: { label: "Continuer vers l'onboarding", href: '/onboarding' },
      secondary: null,
    }

  return {
    primary: { label: 'Accéder au dashboard', href: '/dashboard' },
    secondary: null,
  }
}
