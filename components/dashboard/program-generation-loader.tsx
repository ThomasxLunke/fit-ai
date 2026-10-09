'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBySessionAuth } from '@/app/actions'
import { generateProgram, generateProgramAgentic } from '@/lib/ai'
import { createProgramOnBoarding, updateUser } from '@/lib/api'
import {
  getOnboardingPayload,
  clearOnboardingPayload,
} from '@/lib/onboarding-storage'
import type { TopicScore } from '@/lib/retrieval'
import { TopicScoresPanel } from './topic-scores-panel'

const STATUS_MESSAGES = [
  'Récupération de vos mesures…',
  "Interrogation de la base d'ouvrages spécialisés…",
  'Calcul de vos ratios de leviers…',
  'Sélection des exercices adaptés à votre morphologie…',
  'Rédaction des justifications biomécaniques…',
  'Finalisation de votre programme…',
]

const FUN_FACTS = [
  'Un bras de levier plus court permet souvent de déplacer une charge plus lourde, mais sur une amplitude de mouvement plus réduite.',
  "La longueur relative de votre fémur influence directement l'angle d'inclinaison du buste optimal en squat.",
  'Deux personnes de même taille peuvent avoir des ratios de segments totalement différents — donc des exercices de référence différents.',
  'Le rowing et le tirage horizontal sollicitent davantage le grand dorsal quand le torse est proportionnellement plus long.',
  'Un avant-bras court par rapport au bras favorise mécaniquement les mouvements de flexion du coude, comme le curl biceps.',
  'La biomécanique explique pourquoi un même exercice peut sembler facile pour une personne et difficile pour une autre, à charge égale.',
  'Squat, développé couché et soulevé de terre restent efficaces sur toutes les morphologies — mais jamais avec la même technique optimale.',
]

export function ProgramGenerationLoader({
  agentic = false,
}: {
  agentic?: boolean
}) {
  const router = useRouter()
  const [statusIndex, setStatusIndex] = useState(0)
  const [factIndex, setFactIndex] = useState(0)
  const [error, setError] = useState('')

  const [topicScores, setTopicScores] = useState<TopicScore[] | null>(null)
  const hasStarted = useRef(false)

  const runGeneration = async () => {
    setError('')
    const payload = getOnboardingPayload()
    if (!payload) {
      router.replace('/dashboard')
      return
    }

    try {
      const user = await getUserBySessionAuth()

      let program
      let scores: TopicScore[] | null = null
      if (agentic) {
        const result = await generateProgramAgentic(payload)
        scores = result.topicScores
        program = result
      } else {
        program = await generateProgram(payload)
      }

      await createProgramOnBoarding(user.id, program)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { program: _currentProgram, ...userScalars } = user
      await updateUser(user.id, { ...userScalars, onboarded: true })
      clearOnboardingPayload()

      if (scores) setTopicScores(scores)
      else router.replace('/dashboard')
    } catch (err) {
      console.error(err)
      setError(
        'La génération de votre programme a échoué. Vos mesures sont conservées : vous pouvez réessayer sans repasser devant la caméra.',
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
    if (error || topicScores) return
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 6000)
    return () => clearInterval(id)
  }, [error, topicScores])

  useEffect(() => {
    if (error || topicScores) return
    const id = setInterval(() => {
      setFactIndex((i) => (i + 1) % FUN_FACTS.length)
    }, 9000)
    return () => clearInterval(id)
  }, [error, topicScores])

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
        ) : topicScores ? (
          <>
            <h1>Qualité du retrieval par tag</h1>
            <TopicScoresPanel topicScores={topicScores} />
            <button
              type="button"
              className="lg-btn lg-btn-primary"
              onClick={() => router.replace('/dashboard')}
            >
              Continuer
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

      {!error && !topicScores && (
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
