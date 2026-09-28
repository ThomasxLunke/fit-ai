// Pure helpers — kept out of lib/ai.ts because that file has 'use server'
// at the top, which makes Next.js treat every one of its exports as a
// Server Action (and Server Actions must be async); these are plain sync
// functions, so they need their own module to stay exportable/importable
// without breaking the build.

// onBoarding.arm = (bras/avant-bras) mesuré en step 4 de l'onboarding
// (firstDistance épaule-coude / secondDistance coude-poignet — voir
// onboarding-form.tsx). >1 = bras plus long que l'avant-bras, <1 = l'inverse.
// Graduée délibérément plutôt qu'une large bande "proportionné" unique :
// même un écart de 5-10% change mesurablement le bras de levier dans un
// mouvement, donc regrouper tout ce qui est proche de 1.0 sous "équilibré"
// jetterait un vrai signal exploitable — seul un écart réellement
// négligeable (~3%) est qualifié de "quasiment identique". Les seuils
// restent des heuristiques, pas des normes anthropométriques validées :
// le but est une lecture directionnelle cohérente d'un utilisateur à
// l'autre, pas une prétention à la précision.
export const interpretForearmRatio = (ratio: number) => {
  if (ratio > 1.1) return 'avant-bras nettement plus court que le bras'
  if (ratio > 1.03) return 'avant-bras légèrement plus court que le bras'
  if (ratio < 0.9) return 'avant-bras nettement plus long que le bras'
  if (ratio < 0.97) return 'avant-bras légèrement plus long que le bras'
  return 'bras et avant-bras de longueur quasiment identique'
}

export const interpretTorsoLegRatio = (ratio: number) => {
  if (ratio > 0.57) return 'buste nettement plus long par rapport aux jambes'
  if (ratio > 0.515)
    return 'buste légèrement plus long par rapport aux jambes'
  if (ratio < 0.43)
    return 'jambes nettement plus longues par rapport au buste'
  if (ratio < 0.485)
    return 'jambes légèrement plus longues par rapport au buste'
  return 'buste et jambes de longueur quasiment identique'
}
