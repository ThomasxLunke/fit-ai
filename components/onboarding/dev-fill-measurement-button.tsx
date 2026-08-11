'use client'

// Dev-only shortcut — lets you skip actually standing in front of the
// camera while iterating on everything downstream of onboarding (dashboard,
// program generation...). Inert in a production build regardless (the
// NODE_ENV check below returns null), but delete this file + its one call
// site in onboarding-form.tsx before shipping if you'd rather not carry the
// code path at all.
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
