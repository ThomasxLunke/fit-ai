import type { OnBoardingSchema } from '@/components/onboarding-form'

const OBJECTIVES = ['lose', 'gain', 'maintain'] as const

const PROGRAM_PREFERENCES = [
  'push-pull-legs',
  'half-body',
  'full-body',
  'split',
  'none',
] as const

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const randomFloat = (min: number, max: number) =>
  min + Math.random() * (max - min)

const pick = <T>(items: readonly T[]): T =>
  items[randomInt(0, items.length - 1)]

const randomDays = (count: number) => {
  const days = [1, 2, 3, 4, 5, 6, 7]
  for (let i = days.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[days[i], days[j]] = [days[j], days[i]]
  }
  return days.slice(0, count).sort((a, b) => a - b)
}

// Dev-only, used by components/landing/dev-random-onboarding-button.tsx.
// arm/leg/torso mimic what handleSubmit() in onboarding-form.tsx actually
// produces — average() over camera-derived ratios/pixel distances — not the
// 0-2 range the zod schema types them as. Same approximation as
// fillFakeMeasurement() in that same file.
export const randomOnboardingPayload = (): OnBoardingSchema => {
  // const sessionPerWeek = randomInt(2, 6)

  return {
    sessionPerWeek: 5,
    dayAvailable: [
      1, 2, 3, 5, 6,
    ] /* randomDays(randomInt(sessionPerWeek, 7)) */,
    objective: 'gain' /* pick(OBJECTIVES) */,
    programPreferences: 'split' /* pick(PROGRAM_PREFERENCES) */,
    arm: randomFloat(0.8, 1.1),
    leg: randomFloat(260, 340),
    torso: randomFloat(120, 180),
  }
}
