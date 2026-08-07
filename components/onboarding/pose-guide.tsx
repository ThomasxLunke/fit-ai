export type PoseHighlight = 'left-arm' | 'legs' | 'torso'

const MUTED = 'var(--lg-muted)'
const AMBER = 'var(--lg-amber)'
const CYAN = 'var(--lg-cyan)'

// One shared front-facing stick figure — legs and torso measurements use the
// exact same stance (standing straight, arms relaxed, facing the camera),
// only the highlighted segment differs. The arm step reuses the same
// front-facing figure too (not a side profile) so the pose never implies the
// user should turn relative to the camera — the elbow bend is drawn crossing
// in front of the torso outline (paint order, not a viewpoint change), a
// standard flat-pictogram convention for "in front of the body".
export function PoseGuide({ highlight }: { highlight: PoseHighlight }) {
  const isArm = highlight === 'left-arm'
  const isLegs = highlight === 'legs'
  const isTorso = highlight === 'torso'

  const armColor = isArm ? AMBER : MUTED
  const legColor = isLegs ? AMBER : MUTED
  const torsoColor = isTorso ? AMBER : MUTED
  const armWidth = isArm ? 5 : 3
  const legWidth = isLegs ? 5 : 3
  const torsoWidth = isTorso ? 5 : 3
  const jointR = (active: boolean) => (active ? 5 : 4)
  const jointFill = (active: boolean) => (active ? AMBER : MUTED)

  return (
    <svg viewBox="0 0 200 420" width="88%" height="100%">
      {/* torso outline, drawn first so a bent forearm can paint over it */}
      <line x1="72" y1="80" x2="82" y2="205" stroke={torsoColor} strokeWidth={torsoWidth} strokeLinecap="round" />
      <line x1="128" y1="80" x2="118" y2="205" stroke={torsoColor} strokeWidth={torsoWidth} strokeLinecap="round" />
      <line x1="72" y1="80" x2="128" y2="80" stroke={MUTED} strokeWidth={2} />
      <line x1="82" y1="205" x2="118" y2="205" stroke={MUTED} strokeWidth={2} />

      {/* legs */}
      <line x1="82" y1="205" x2="80" y2="300" stroke={legColor} strokeWidth={legWidth} strokeLinecap="round" />
      <line x1="80" y1="300" x2="78" y2="390" stroke={legColor} strokeWidth={legWidth} strokeLinecap="round" />
      <line x1="118" y1="205" x2="120" y2="300" stroke={legColor} strokeWidth={legWidth} strokeLinecap="round" />
      <line x1="120" y1="300" x2="122" y2="390" stroke={legColor} strokeWidth={legWidth} strokeLinecap="round" />

      {/* right arm — always relaxed at the side */}
      <line x1="128" y1="80" x2="142" y2="140" stroke={MUTED} strokeWidth={3} strokeLinecap="round" />
      <line x1="142" y1="140" x2="148" y2="195" stroke={MUTED} strokeWidth={3} strokeLinecap="round" />

      {/* left arm — relaxed, or bent 90° in front of the torso when highlighted */}
      {isArm ? (
        <>
          <line x1="72" y1="80" x2="62" y2="150" stroke={armColor} strokeWidth={armWidth} strokeLinecap="round" />
          <line x1="62" y1="150" x2="102" y2="150" stroke={armColor} strokeWidth={armWidth} strokeLinecap="round" />
          <circle cx="62" cy="150" r={5} fill={AMBER} />
          <circle cx="102" cy="150" r={5} fill={AMBER} />
        </>
      ) : (
        <>
          <line x1="72" y1="80" x2="58" y2="140" stroke={MUTED} strokeWidth={3} strokeLinecap="round" />
          <line x1="58" y1="140" x2="52" y2="195" stroke={MUTED} strokeWidth={3} strokeLinecap="round" />
        </>
      )}

      {/* head */}
      <circle cx="100" cy="42" r={22} fill="none" stroke={CYAN} strokeWidth={2.5} />

      {/* joints */}
      <circle cx="72" cy="80" r={jointR(isTorso || isArm)} fill={jointFill(isTorso || isArm)} />
      <circle cx="128" cy="80" r={jointR(isTorso)} fill={jointFill(isTorso)} />
      <circle cx="82" cy="205" r={jointR(isTorso || isLegs)} fill={jointFill(isTorso || isLegs)} />
      <circle cx="118" cy="205" r={jointR(isTorso || isLegs)} fill={jointFill(isTorso || isLegs)} />
      <circle cx="80" cy="300" r={jointR(isLegs)} fill={jointFill(isLegs)} />
      <circle cx="120" cy="300" r={jointR(isLegs)} fill={jointFill(isLegs)} />
      <circle cx="78" cy="390" r={jointR(isLegs)} fill={jointFill(isLegs)} />
      <circle cx="122" cy="390" r={jointR(isLegs)} fill={jointFill(isLegs)} />

      {/* annotations */}
      {isArm && (
        <g fontFamily="var(--font-plex-mono)">
          <line x1="30" y1="80" x2="30" y2="150" stroke={CYAN} strokeDasharray="2 3" strokeWidth={1.4} />
          <line x1="24" y1="80" x2="36" y2="80" stroke={CYAN} strokeWidth={1.4} />
          <line x1="24" y1="150" x2="36" y2="150" stroke={CYAN} strokeWidth={1.4} />
          <text x="14" y="118" fill={CYAN} fontSize={9} transform="rotate(-90 14 118)" textAnchor="middle">
            ⊥ SOL
          </text>
          <line x1="62" y1="165" x2="102" y2="165" stroke={CYAN} strokeDasharray="2 3" strokeWidth={1.4} />
          <text x="82" y="180" fill={CYAN} fontSize={9} textAnchor="middle">
            ∥ SOL
          </text>
          <path d="M62 150 h12 v12" fill="none" stroke={AMBER} strokeWidth={1.6} />
          <text x="86" y="138" fill={AMBER} fontSize={10} fontWeight={700}>
            90°
          </text>
        </g>
      )}
      {(isLegs || isTorso) && (
        <g>
          <g stroke={CYAN} strokeDasharray="2 3" strokeWidth={1.2} fill="none">
            <path d="M8 20 h16 M8 20 v16 M192 20 h-16 M192 20 v16" />
            <path d="M8 400 h16 M8 400 v-16 M192 400 h-16 M192 400 v-16" />
          </g>
          <text x="100" y="415" fill={CYAN} fontSize={9} textAnchor="middle" fontFamily="var(--font-plex-mono)">
            CORPS ENTIER DANS LE CADRE
          </text>
        </g>
      )}
    </svg>
  )
}
