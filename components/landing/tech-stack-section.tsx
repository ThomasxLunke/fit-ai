const STACK = [
  'Next.js',
  'React',
  'shadcn/ui',
  'Prisma',
  'TensorFlow.js',
  'LangChain',
]

export function TechStackSection() {
  return (
    <section id="stack">
      <div className="lg-wrap">
        <div className="lg-section-head">
          <div className="lg-eyebrow">stack technique</div>
          <h2>Construit avec des outils de production.</h2>
        </div>
        <div className="lg-stack-band">
          {STACK.map((name) => (
            <span className="lg-chip" key={name}>
              <span className="lg-sw" />
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
