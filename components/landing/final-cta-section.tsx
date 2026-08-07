import type { CSSProperties } from 'react'
import { CtaAction } from './cta-action'
import type { LandingCta } from './cta'

export function FinalCtaSection({ cta }: { cta: LandingCta }) {
  return (
    <section className="lg-final-cta">
      <div className="lg-wrap">
        <div className="lg-panel">
          <span className="lg-br" />
          <div>
            <div className="lg-prompt lg-mono">
              generate --profile=vous --sourced=true
            </div>
            <h2>Mesurez. Générez. Entraînez-vous.</h2>
          </div>
          <CtaAction
            className="lg-btn lg-btn-primary"
            link={cta.primary}
            style={
              {
                '--lg-control-height': '56px',
                paddingLeft: 28,
                paddingRight: 28,
                fontSize: '0.9rem',
              } as CSSProperties
            }
          />
        </div>
      </div>
    </section>
  )
}
