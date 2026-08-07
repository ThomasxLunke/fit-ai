'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBySessionAuth } from '@/app/actions'
import { generateProgram } from '@/lib/ai'
import { createProgramOnBoarding, updateUser } from '@/lib/api'
import type { OnBoardingSchema } from '@/components/onboarding-form'

const STORAGE_KEY = 'fitai:onboarding-payload'

const STATUS_MESSAGES = [
  'Récupération de vos mesures…',
  "Interrogation de la base d'ouvrages spécialisés…",
  'Calcul de vos ratios de leviers…',
  'Sélection des exercices adaptés à votre morphologie…',
  'Rédaction des justifications biomécaniques…',
  'Finalisation de votre programme…',
]

const FUN_FACTS = [
  "Un bras de levier plus court permet souvent de déplacer une charge plus lourde, mais sur une amplitude de mouvement plus réduite.",
  "La longueur relative de votre fémur influence directement l'angle d'inclinaison du buste optimal en squat.",
  'Deux personnes de même taille peuvent avoir des ratios de segments totalement différents — donc des exercices de référence différents.',
  'Le rowing et le tirage horizontal sollicitent davantage le grand dorsal quand le torse est proportionnellement plus long.',
  "Un avant-bras court par rapport au bras favorise mécaniquement les mouvements de flexion du coude, comme le curl biceps.",
  'La biomécanique explique pourquoi un même exercice peut sembler facile pour une personne et difficile pour une autre, à charge égale.',
  'Squat, développé couché et soulevé de terre restent efficaces sur toutes les morphologies — mais jamais avec la même technique optimale.',
]

// Rendered by app/(dashboard)/dashboard/page.tsx when landing on
// /dashboard?generating=1 (see onboarding-form.tsx's handleSubmit, which
// redirects here immediately instead of waiting on the wizard's last step).
// The actual generation payload travels via sessionStorage, not the URL.
export function ProgramGenerationLoader() {
  const router = useRouter()
  const [statusIndex, setStatusIndex] = useState(0)
  const [factIndex, setFactIndex] = useState(0)
  const [error, setError] = useState('')
  const hasStarted = useRef(false)

  const runGeneration = async () => {
    setError('')
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Nothing to generate (direct visit, or already consumed) — re-evaluate
      // the page normally instead of showing a loader forever.
      router.replace('/dashboard')
      return
    }

    try {
      const payload = JSON.parse(raw) as OnBoardingSchema
      const user = await getUserBySessionAuth()
      const program = await generateProgram(payload)
      await createProgramOnBoarding(user.id, program)
      await updateUser(user.id, { ...user, onboarded: true })
      sessionStorage.removeItem(STORAGE_KEY)
      router.replace('/dashboard')
    } catch (err) {
      console.error(err)
      setError(
        'La génération de votre programme a échoué. Vos mesures sont conservées : vous pouvez réessayer sans repasser devant la caméra.'
      )
    }
  }

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true
    runGeneration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (error) return
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 6000)
    return () => clearInterval(id)
  }, [error])

  useEffect(() => {
    if (error) return
    const id = setInterval(() => {
      setFactIndex((i) => (i + 1) % FUN_FACTS.length)
    }, 9000)
    return () => clearInterval(id)
  }, [error])

  return (
    <div className="lg-wrap lg-generation">
      <div className="lg-panel lg-generation-panel">
        <span className="lg-br" />
        <div className="lg-eyebrow">génération_programme</div>
        {error ? (
          <>
            <h1>Un problème est survenu</h1>
            <p className="lg-generation-error">{error}</p>
            <button
              type="button"
              className="lg-btn lg-btn-primary"
              onClick={runGeneration}
            >
              Réessayer
            </button>
          </>
        ) : (
          <>
            <h1>Génération de votre programme</h1>
            <p className="lg-generation-status lg-mono">
              {STATUS_MESSAGES[statusIndex]}
            </p>
            <div className="lg-generation-bar">
              <span className="lg-scanline" />
            </div>
          </>
        )}
      </div>

      {!error && (
        <div className="lg-panel lg-fact-panel">
          <span className="lg-br" />
          <div className="lg-eyebrow">le saviez-vous ?</div>
          <p key={factIndex} className="lg-fact-text">
            {FUN_FACTS[factIndex]}
          </p>
        </div>
      )}
    </div>
  )
}
