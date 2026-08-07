export function StepProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  return (
    <div className="lg-step-progress">
      <div className="lg-step-progress-label lg-mono">
        <span>Onboarding</span>
        <span>
          Étape <b>{String(current + 1).padStart(2, '0')}</b> /{' '}
          {String(total).padStart(2, '0')}
        </span>
      </div>
      <div
        className="lg-step-progress-bar"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={
              i <= current ? 'lg-step-seg lg-step-seg-done' : 'lg-step-seg'
            }
          />
        ))}
      </div>
    </div>
  )
}
