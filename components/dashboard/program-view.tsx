'use client'

import { useState } from 'react'
import type {
  Program,
  TrainingSession,
  Exercise,
} from '@/lib/generated/prisma'
import { WeekStrip } from './week-strip'
import { ExerciseSpecCard } from './exercise-spec-card'

type SessionWithExercises = TrainingSession & { exercises: Exercise[] }
type ProgramWithSessions = Program & {
  trainingSessions: SessionWithExercises[]
}

export function ProgramView({ program }: { program: ProgramWithSessions }) {
  const [activeDay, setActiveDay] = useState(
    program.trainingSessions[0]?.day ?? 'Lundi'
  )

  const activeSession = program.trainingSessions.find(
    (s) => s.day === activeDay
  )

  return (
    <div className="lg-wrap">
      <div className="lg-panel lg-program-head">
        <span className="lg-br" />
        <div className="lg-eyebrow">programme_actif</div>
        <h1>{program.name}</h1>
        <p>{program.description}</p>
      </div>

      <WeekStrip
        sessions={program.trainingSessions.map((s) => ({
          day: s.day,
          name: s.name,
        }))}
        activeDay={activeDay}
        onSelectDay={setActiveDay}
      />

      {activeSession ? (
        <div className="lg-session-detail">
          <div className="lg-session-detail-head">
            <span className="lg-day-badge lg-mono">{activeSession.day}</span>
            <h2>{activeSession.name}</h2>
          </div>
          <p className="lg-session-detail-desc">
            {activeSession.description}
          </p>
          <div className="flex flex-col gap-4">
            {activeSession.exercises.map((exercise, i) => (
              <ExerciseSpecCard
                key={exercise.id}
                exercise={exercise}
                index={i}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Aucune séance pour ce jour.</p>
      )}
    </div>
  )
}
