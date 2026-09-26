import type { OnBoardingSchema } from '@/components/onboarding-form'

const PAYLOAD_KEY = 'fitai:onboarding-payload'
const DEV_LAST_PAYLOAD_KEY = 'fitai:dev-last-onboarding-payload'

// Consumed by program-generation-loader.tsx right after this is set, and
// cleared once generation succeeds — see clearOnboardingPayload().
export const setOnboardingPayload = (payload: OnBoardingSchema) => {
  sessionStorage.setItem(PAYLOAD_KEY, JSON.stringify(payload))

  // Dev-only: kept in localStorage (unlike the sessionStorage copy above,
  // which gets cleared once consumed) so the dashboard can still show "what
  // was submitted" once the generated program comes back. See
  // components/dashboard/dev-onboarding-payload-panel.tsx.
  if (process.env.NODE_ENV !== 'production') {
    localStorage.setItem(DEV_LAST_PAYLOAD_KEY, JSON.stringify(payload))
  }
}

export const getOnboardingPayload = (): OnBoardingSchema | null => {
  const raw = sessionStorage.getItem(PAYLOAD_KEY)
  return raw ? (JSON.parse(raw) as OnBoardingSchema) : null
}

export const clearOnboardingPayload = () => {
  sessionStorage.removeItem(PAYLOAD_KEY)
}

export const getDevLastOnboardingPayload = (): OnBoardingSchema | null => {
  if (process.env.NODE_ENV === 'production') return null
  const raw = localStorage.getItem(DEV_LAST_PAYLOAD_KEY)
  return raw ? (JSON.parse(raw) as OnBoardingSchema) : null
}
