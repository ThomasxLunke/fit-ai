export function ProblemSection() {
  return (
    <section id="pourquoi">
      <div className="lg-wrap">
        <div className="lg-section-head">
          <div className="lg-eyebrow">le problème</div>
          <h2>Un même programme ne convient pas à deux corps différents.</h2>
          <p>
            Les longueurs relatives de vos segments changent la mécanique de
            chaque mouvement — et la plupart des programmes ignorent
            complètement cette variable.
          </p>
        </div>
        <div className="lg-grid-3">
          <div className="lg-card">
            <span className="lg-k">01</span>
            <h3>Morphologie ignorée</h3>
            <p>
              Un torse long et des jambes courtes ne sollicitent pas les
              mêmes leviers qu&apos;une morphologie inverse — même exercice,
              résultat différent.
            </p>
          </div>
          <div className="lg-card">
            <span className="lg-k">02</span>
            <h3>Mesures approximatives</h3>
            <p>
              Mètre ruban, à l&apos;œil, souvenirs approximatifs : les ratios
              utilisés pour bâtir un programme sont rarement mesurés avec
              rigueur.
            </p>
          </div>
          <div className="lg-card">
            <span className="lg-k">03</span>
            <h3>Zéro source citée</h3>
            <p>
              « Fais 4x10 » — sans jamais dire pourquoi cet exercice, pour ce
              corps, à cette charge.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
