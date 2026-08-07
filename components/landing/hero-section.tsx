import { CtaAction } from './cta-action'
import type { LandingCta } from './cta'

export function HeroSection({ cta }: { cta: LandingCta }) {
  return (
    <div className="lg-wrap lg-hero">
      <div>
        <div className="lg-eyebrow">pose_estimation.ready</div>
        <h1>
          Votre morphologie <em>mesurée</em>,
          <br />
          votre programme <em>adapté</em>.
        </h1>
        <p className="lg-lead">
          Fit-AI mesure vos segments — torse, jambes, bras — via votre caméra
          et TensorFlow.js, puis génère un programme de musculation sourcé sur
          des ouvrages spécialisés, adapté à vos leviers articulaires réels.
        </p>
        <div className="lg-hero-actions">
          <CtaAction className="lg-btn lg-btn-primary" link={cta.primary}>
            Mesurer mes segments →
          </CtaAction>
          <a className="lg-btn lg-btn-ghost" href="#comment">
            Voir comment ça marche
          </a>
        </div>
        <div className="lg-trust-line">
          <span className="lg-pulse" />
          100 échantillons / segment · calcul de ratio en temps réel dans le
          navigateur
        </div>
      </div>

      <div className="lg-panel lg-readout">
        <span className="lg-br" />
        <div className="lg-readout-head">
          <span>BODYPIX.SEGMENT_PERSON_PARTS</span>
          <span className="lg-rec">LIVE</span>
        </div>
        <div className="lg-pose-stage">
          <svg
            viewBox="0 0 240 320"
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
          >
            <g stroke="var(--lg-muted)" strokeWidth={2} strokeLinecap="round">
              <line x1="120" y1="70" x2="120" y2="150" />
              <line x1="120" y1="80" x2="80" y2="110" />
              <line x1="80" y1="110" x2="66" y2="150" />
              <line x1="120" y1="80" x2="160" y2="110" />
              <line x1="160" y1="110" x2="174" y2="150" />
              <line x1="120" y1="150" x2="100" y2="220" />
              <line x1="100" y1="220" x2="96" y2="280" />
              <line x1="120" y1="150" x2="140" y2="220" />
              <line x1="140" y1="220" x2="144" y2="280" />
            </g>
            <circle
              cx="120"
              cy="55"
              r="16"
              fill="none"
              stroke="var(--lg-cyan)"
              strokeWidth={2}
            />
            <g fill="var(--lg-amber)">
              <circle cx="120" cy="80" r="3.5" />
              <circle cx="80" cy="110" r="3.5" />
              <circle cx="66" cy="150" r="3.5" />
              <circle cx="160" cy="110" r="3.5" />
              <circle cx="174" cy="150" r="3.5" />
              <circle cx="120" cy="150" r="3.5" />
              <circle cx="96" cy="220" r="3.5" />
              <circle cx="96" cy="280" r="3.5" />
              <circle cx="140" cy="220" r="3.5" />
              <circle cx="144" cy="280" r="3.5" />
            </g>
            <g fontFamily="var(--font-plex-mono)" fontSize={9} fill="var(--lg-muted)">
              <line
                x1="180"
                y1="110"
                x2="200"
                y2="110"
                stroke="var(--lg-border)"
                strokeDasharray="2 2"
              />
              <line
                x1="180"
                y1="150"
                x2="200"
                y2="150"
                stroke="var(--lg-border)"
                strokeDasharray="2 2"
              />
              <text x="203" y="133" fill="var(--lg-amber)">
                0.94×
              </text>
              <text x="203" y="144" fill="var(--lg-muted)" fontSize={7}>
                avant-bras
              </text>
              <line
                x1="30"
                y1="150"
                x2="12"
                y2="150"
                stroke="var(--lg-border)"
                strokeDasharray="2 2"
              />
              <line
                x1="30"
                y1="280"
                x2="12"
                y2="280"
                stroke="var(--lg-border)"
                strokeDasharray="2 2"
              />
              <text
                x="-30"
                y="218"
                fill="var(--lg-cyan)"
                transform="rotate(-90 10 218)"
              >
                1.14× buste/jambe
              </text>
            </g>
          </svg>
          <div className="lg-scanline" />
        </div>
        <div className="lg-readout-foot">
          <span>
            ratio bras&nbsp;: <b>0.94×</b>
          </span>
          <span>
            ratio buste/jambe&nbsp;: <b>1.14×</b>
          </span>
          <span>
            échantillons&nbsp;: <b>100/100</b>
          </span>
        </div>
      </div>
    </div>
  )
}
