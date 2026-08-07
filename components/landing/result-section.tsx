export function ResultSection() {
  return (
    <section id="resultat">
      <div className="lg-wrap lg-result-grid">
        <div className="lg-result-copy">
          <div className="lg-eyebrow">le différenciateur</div>
          <span className="lg-tag">◆ chaque exercice est justifié</span>
          <h2>Pas juste un programme. Un raisonnement, par exercice.</h2>
          <p>
            Chaque mouvement généré embarque sa justification biomécanique et
            sa source — nom de l&apos;ouvrage, page, extrait. Visible
            directement sur votre tableau de bord.
          </p>
          <p>
            Aucune boîte noire : vous savez toujours pourquoi cet exercice a
            été choisi pour votre morphologie.
          </p>
        </div>
        <div className="lg-panel">
          <span className="lg-br" />
          <div className="lg-spec-sheet-head">
            <span>EXERCICE_04</span>
            <span>validé ✓</span>
          </div>
          <div className="lg-spec-row">
            <span className="lg-field">NOM</span>
            <span className="lg-value">
              <b>Rowing buste penché à la barre</b>
            </span>
          </div>
          <div className="lg-spec-row">
            <span className="lg-field">SÉRIES</span>
            <span className="lg-value lg-mono">
              4 × 8{' '}
              <span style={{ color: 'var(--lg-muted)' }}>
                · charge ≈ 60 % 1RM
              </span>
            </span>
          </div>
          <div className="lg-spec-row">
            <span className="lg-field">RAISON</span>
            <span className="lg-value">
              Ratio buste/jambe 1.14 (torse long) : ce mouvement maximise
              l&apos;amplitude utile sur les dorsaux sans excès de flexion
              lombaire.
            </span>
          </div>
          <div className="lg-spec-row lg-source">
            <span className="lg-field">SOURCE</span>
            <span className="lg-value">
              Zatsiorsky &amp; Kraemer, <i>Science and Practice of Strength
              Training</i>, p. 214 — « Les leviers du dos varient
              significativement selon la longueur relative du torse… »
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
