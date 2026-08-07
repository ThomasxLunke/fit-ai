export function HowItWorksSection() {
  return (
    <section id="comment">
      <div className="lg-wrap">
        <div className="lg-section-head">
          <div className="lg-eyebrow">le pipeline</div>
          <h2>Trois étapes, exécutées dans cet ordre.</h2>
          <p>
            De la caméra à la base vectorielle, chaque étape alimente la
            suivante.
          </p>
        </div>
        <div className="lg-pipeline">
          <div className="lg-pipe-step">
            <div className="lg-pipe-num lg-mono">01</div>
            <h3>Mesure par caméra</h3>
            <p>
              TensorFlow.js (BodyPix) détecte vos points clés — épaule,
              coude, poignet, hanche, genou, cheville — et calcule vos
              ratios sur 100 échantillons, en local dans le navigateur.
            </p>
          </div>
          <div className="lg-pipe-step">
            <div className="lg-pipe-num lg-mono">02</div>
            <h3>Préférences</h3>
            <p>
              Jours disponibles, objectif (perte, prise, maintien), format
              de programmation — push/pull/legs, half-body, full-body,
              split.
            </p>
          </div>
          <div className="lg-pipe-step">
            <div className="lg-pipe-num lg-mono">03</div>
            <h3>Génération sourcée</h3>
            <p>
              GPT, orchestré via LangChain, croise vos ratios et préférences
              avec des extraits d&apos;ouvrages spécialisés indexés dans une
              base vectorielle, puis structure le programme complet.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
