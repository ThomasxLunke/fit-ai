'use client'

export function DevFillMeasurementButton({ onFill }: { onFill: () => void }) {
  if (process.env.NODE_ENV === 'production') return null

  return (
    <button
      type="button"
      className="lg-btn lg-btn-ghost lg-dev-fill"
      onClick={onFill}
    >
      🧪 Dev — remplir cette mesure
    </button>
  )
}
