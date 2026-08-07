'use client'

const DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

export function WeekStrip({
  sessions,
  activeDay,
  onSelectDay,
}: {
  sessions: { day: string; name: string }[]
  activeDay: string
  onSelectDay: (day: string) => void
}) {
  const nameByDay = new Map(sessions.map((s) => [s.day, s.name]))

  return (
    <div className="lg-week-strip">
      {DAYS.map((day) => {
        const name = nameByDay.get(day)
        const isActive = day === activeDay
        return (
          <button
            key={day}
            type="button"
            className={
              'lg-week-cell' +
              (!name ? ' lg-week-cell-rest' : '') +
              (isActive ? ' lg-week-cell-active' : '')
            }
            disabled={!name}
            aria-pressed={isActive}
            onClick={() => onSelectDay(day)}
          >
            <span className="lg-week-cell-day lg-mono">{day.slice(0, 3)}</span>
            <span className="lg-week-cell-name">{name ?? '—'}</span>
          </button>
        )
      })}
    </div>
  )
}
