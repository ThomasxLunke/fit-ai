import type { Exercise } from '@/lib/generated/prisma'

// Same "spec-sheet" visual language as the landing's Result section
// (.lg-panel / .lg-spec-row) — the dashboard is where that promise
// ("chaque exercice est justifié") actually gets delivered.
export function ExerciseSpecCard({
  exercise,
  index,
}: {
  exercise: Exercise
  index: number
}) {
  return (
    <div className="lg-panel lg-exercise-card">
      <span className="lg-br" />
      <div className="lg-spec-sheet-head">
        <span>EXERCICE_{String(index + 1).padStart(2, '0')}</span>
        <span>validé ✓</span>
      </div>
      <div className="lg-spec-row">
        <span className="lg-field">NOM</span>
        <span className="lg-value">
          <b>{exercise.name}</b>
        </span>
      </div>
      <div className="lg-spec-row">
        <span className="lg-field">SÉRIES</span>
        <span className="lg-value lg-mono">
          {exercise.sets} × {exercise.reps}{' '}
          <span style={{ color: 'var(--lg-muted)' }}>
            · {exercise.weight} kg
          </span>
        </span>
      </div>
      <div className="lg-spec-row">
        <span className="lg-field">DESCRIPTION</span>
        <span className="lg-value">{exercise.description}</span>
      </div>
      <div className="lg-spec-row">
        <span className="lg-field">RAISON</span>
        <span className="lg-value">{exercise.reason}</span>
      </div>
      <div className="lg-spec-row lg-source">
        <span className="lg-field">SOURCE</span>
        <span className="lg-value">
          {exercise.sourceBook}, p.{exercise.sourcePage} — «{' '}
          {exercise.sourceExcerpt} »
        </span>
      </div>
    </div>
  )
}
