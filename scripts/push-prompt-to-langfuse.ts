// Run with: npx tsx scripts/push-prompt-to-langfuse.ts
//
// One-time push of generateProgram()'s prompt template into Langfuse's
// prompt registry under the name "program-generation". lib/ai.ts fetches
// it from there at runtime instead of an inline template literal — the
// prompt becomes versioned production data, editable from Langfuse's UI
// without a code deploy. Re-run this script (it creates a new version
// each time) whenever the prompt text itself needs to change via code
// review rather than through the Langfuse UI directly.

import { loadEnv } from './load-env'

loadEnv()

import { LangfuseClient } from '@langfuse/client'

// LangChain's {variable} syntax -> Langfuse's Mustache {{variable}}
// syntax. The text below is brace-free everywhere except real template
// variables specifically so this regex conversion is unambiguous — no
// literal curly braces survive from the original (e.g. the old JSON-ish
// schema illustration was rewritten as plain field-list prose for this
// exact reason, see lib/ai.ts's git history).
const PROMPT_TEXT = `
Tu es un coach expert en biomécanique, morphoanatomie et optimisation des leviers articulaires.

Voici l'interprétation des données morphoanatomiques de l'utilisateur (mesures caméra, à traiter comme une indication directionnelle) :
- Avant-bras vs bras : {forearmInterpretation} (ratio bras/avant-bras mesuré : {shoulderElbowToElbowWristRatio})
- Buste vs jambes : {torsoLegInterpretation} (ratio buste/jambes mesuré : {torsoLegRatio})

Objectif de l'utilisateur : {objective} son poids.

Jours d'entraînement disponibles : {dayAvailable}
Nombre de séances par semaine : {sessionPerWeek}

Préférences de l'utilisateur pour la programmation : {programPreferences}

Voici un contexte extrait d’ouvrages spécialisés :
{context}

Consignes impératives :
1. Le champ "description" du programme doit commencer par une ou deux phrases en langage clair (pas les ratios bruts) qui expliquent à l'utilisateur ces deux interprétations morphologiques et ce qu'elles impliquent pour son entraînement.
2. Le contexte ci-dessous étiquette chaque extrait par groupe musculaire et par type : "description exercice" ou "morphologie/blessure". Pour chaque exercice, s'il existe dans le contexte un extrait "morphologie/blessure" du MÊME groupe musculaire, tu DOIS baser "justification.reason" et "source.excerpt" sur CET extrait (pas sur l'extrait "description exercice") : reformule concrètement le fait qu'il rapporte (longueur de membre, angle articulaire, proportion, risque de blessure précis) et relie-le explicitement à l'interprétation morphologique de l'utilisateur donnée plus haut. N'utilise un extrait "description exercice" comme source que si aucun extrait "morphologie/blessure" pertinent n'existe pour ce groupe musculaire dans le contexte. Interdiction absolue des formules creuses et interchangeables d'un utilisateur à l'autre ("adapté à la morphologie de l'utilisateur", "important/crucial/essentiel pour l'utilisateur", "morphologie proportionnée" utilisé seul sans mécanisme concret) : chaque "reason" doit rester incompréhensible si on la copie-colle sur un autre utilisateur avec une morphologie différente. N'utilise aucun exercice qui ne conviendrait pas à la morphologie indiquée.
3. La répartition des séances et le choix des exercices par séance doivent respecter les préférences de programmation, le nombre de séances et les jours disponibles, tout en restant cohérents avec la morphologie.
4. Chaque séance doit compter entre 4 et 6 exercices : vise plutôt 6 pour une séance "full-body" ou "half-body" qui couvre plusieurs groupes musculaires à la fois, plutôt 4 pour une séance ciblée (split, PPL) centrée sur un ou deux groupes. N'invente jamais un exercice non justifiable par le contexte ci-dessus uniquement pour atteindre ce nombre — s'il n'y a pas assez de matière pertinente dans le contexte pour un groupe musculaire donné, reste en dessous de la fourchette plutôt que d'inventer.
5. Si le contexte fourni contient des exemples de séances ou de semaines-type, appuie-toi sur leur format (nombre d'exercices par séance, fréquence hebdomadaire d'un même groupe musculaire) comme référence de structure — sans copier des exercices inadaptés à la morphologie de l'utilisateur.
6. Pour "justification.source.book", indique exactement l'un des noms de livre apparaissant dans un en-tête "[Source : ...]" du contexte ci-dessus. Pour "source.excerpt", cite un court passage du chunk correspondant.

Respecte strictement le schéma suivant (champs par niveau) :
→ programme : name, description, trainingSessions (liste) : name, description, day, exercises (liste) : name, description, sets, reps, weight, justification : reason, source : book, excerpt

Sois concis mais exhaustif dans les descriptions des mouvements.
`.trim()

function toMustache(template: string): string {
  return template.replace(/\{(\w+)\}/g, '{{$1}}')
}

async function main() {
  const langfuse = new LangfuseClient()
  const prompt = await langfuse.prompt.create({
    name: 'program-generation',
    type: 'text',
    prompt: toMustache(PROMPT_TEXT),
    labels: ['production'],
  })
  console.log(`Pushed "program-generation" v${prompt.version} to Langfuse.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
