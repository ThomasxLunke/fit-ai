'use client'

import { useEffect, useState } from 'react'
import type { OnBoardingSchema } from '@/components/onboarding-form'
import { getDevLastOnboardingPayload } from '@/lib/onboarding-storage'

const OBJECTIVE_LABELS: Record<OnBoardingSchema['objective'], string> = {
  lose: 'Perdre du poids',
  gain: 'Prendre du muscle',
  maintain: 'Maintenir ma forme',
}

const PROGRAM_PREFERENCE_LABELS: Record<
  OnBoardingSchema['programPreferences'],
  string
> = {
  'push-pull-legs': 'Push/Pull/Legs',
  'half-body': 'Half Body',
  'full-body': 'Full Body',
  split: 'Split',
  none: 'Aucune préférence',
}

const DAY_LABELS = [
  '',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

// Dev-only — see components/landing/dev-random-onboarding-button.tsx. Reads
// the payload the generation flow last submitted (kept in localStorage since
// program-generation-loader.tsx clears the sessionStorage copy once
// consumed) so it's visible right above the program it produced.
export function DevOnboardingPayloadPanel() {
  const [payload, setPayload] = useState<OnBoardingSchema | null>(null)

  useEffect(() => {
    setPayload(getDevLastOnboardingPayload())
  }, [])

  if (!payload) return null

  const rows: [string, string][] = [
    ['Séances / semaine', String(payload.sessionPerWeek)],
    [
      'Jours disponibles',
      payload.dayAvailable.map((d) => DAY_LABELS[d]).join(', '),
    ],
    ['Objectif', OBJECTIVE_LABELS[payload.objective]],
    [
      'Préférence programme',
      PROGRAM_PREFERENCE_LABELS[payload.programPreferences],
    ],
    ['Ratio bras (humérus/radius)', payload.arm.toFixed(3)],
    ['Jambes (distance brute)', payload.leg.toFixed(1)],
    ['Buste (distance brute)', payload.torso.toFixed(1)],
  ]

  return (
    <div className="lg-wrap">
      <div className="lg-panel lg-dev-payload-panel">
        <span className="lg-br" />
        <div className="lg-eyebrow">dev — valeurs du formulaire</div>
        <div className="lg-dev-payload-grid lg-mono">
          {rows.map(([label, value]) => (
            <div className="lg-dev-payload-row" key={label}>
              <span className="lg-dev-payload-label">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
