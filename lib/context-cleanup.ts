import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'

// Shared between the app (lib/ai.ts, if it ever needs a runtime fallback)
// and scripts/export-vector-store-content.ts (the offline preprocessing
// pass). No 'use server' here on purpose: this file is also imported by a
// plain Node script run via `tsx`, outside of Next's build pipeline, where
// that directive would be meaningless anyway — only files that need to be
// callable as Server Actions from the browser need it.

// Vector store files here are OCR'd book scans: real explanatory paragraphs
// interleaved with figure-legend fragments (isolated anatomy terms like
// "Grand trochanter"), OCR garbage, page numbers, and watermarks. Feeding
// that noise into a generation prompt wastes tokens and context on lines
// that carry no signal, so this strips it — reorganizing/removing only,
// never rewriting the paragraphs it keeps.
const contextCleanupPromptTemplate = PromptTemplate.fromTemplate(`
Voici un texte brut extrait par OCR d'ouvrages de musculation et de biomécanique. Il mélange de vrais paragraphes explicatifs avec du bruit à éliminer. Deux catégories de paragraphes explicatifs sont à conserver mot pour mot :
1. les descriptions d'exercices, instructions d'exécution, explications physiologiques ;
2. les paragraphes sur l'influence de la morphologie individuelle sur un exercice (longueur des membres, largeur des épaules, proportions osseuses, souplesse, etc.) — ce sont des paragraphes essentiels qui expliquent pourquoi un exercice doit être adapté selon les mensurations d'une personne, ils doivent être conservés aussi systématiquement que les descriptions d'exercice, même sous un titre du type "INFLUENCE DE LA MORPHOLOGIE OSSEUSE SUR L'ENTRAÎNEMENT".

Le bruit à éliminer :
- des légendes de schémas anatomiques : noms de muscles, os ou repères isolés sur leur propre ligne, qui ne forment pas de phrase (ex: "Petit psoas", "Grand trochanter", "Tête du fémur") ;
- des artefacts d'OCR (suites de caractères aléatoires, traits, symboles isolés) ;
- des numéros de page isolés, sommaires, mentions de source ou watermark (ex: "frenchpdf.com") ;
- des sauts de ligne et espaces superflus à l'intérieur d'un même paragraphe.

Piège fréquent : dans les pages consacrées à l'influence de la morphologie, l'OCR entrelace la légende du schéma anatomique AVEC le paragraphe explicatif, ligne par ligne, parce que le texte et l'illustration se partageaient la page. Le paragraphe n'est donc pas dans un bloc à part, il est coupé en plusieurs morceaux séparés par des mots de légende isolés. Dans ce cas, ne jette jamais le paragraphe : recolle les morceaux de phrase dans leur ordre de lecture logique, en retirant uniquement les mots de légende qui s'y sont insérés. Exemple réel (extrait de ce type d'ouvrage) :

Texte brut en entrée :
"""
INFLUENCE DE LA MORPHOLOGIE OSSEUSE DU COUDE
SUR L'ENTRAÎNEMENT

Acromion

Tête de l'humérus

Sillon inter-tuberculaire

Lors de l'entraînement des biceps à la barre,
il est important de prendre en compte les diffé­
rences individuelles de morphologie.
En effet, l'angle d'ouverture du coude, qui correspond
à l'angle entre le bras et l'avant-bras, peut varier d'un
individu à l'autre. Certaines personnes en position

lunatum

Processus stylo'fde
Os scapho'fde

anatomique (c'est-à-dire les bras le long du corps, vers l'intérieur, rendant l'entraînement douloureux.
"""

Résultat attendu (paragraphe reconstitué, légendes supprimées) :
"""
INFLUENCE DE LA MORPHOLOGIE OSSEUSE DU COUDE SUR L'ENTRAÎNEMENT

Lors de l'entraînement des biceps à la barre, il est important de prendre en compte les différences individuelles de morphologie. En effet, l'angle d'ouverture du coude, qui correspond à l'angle entre le bras et l'avant-bras, peut varier d'un individu à l'autre. Certaines personnes en position anatomique (c'est-à-dire les bras le long du corps, vers l'intérieur, rendant l'entraînement douloureux.
"""

Ne garde que les paragraphes réellement informatifs (des deux catégories ci-dessus), en conservant leur contenu mot pour mot — ne reformule et ne résume jamais un paragraphe conservé, y compris quand tu dois le recoller. Conserve un titre d'exercice ou de section uniquement s'il précède directement un paragraphe explicatif, pour ne pas perdre ce contexte. Compacte chaque paragraphe conservé en un seul bloc continu (sans retour à la ligne interne), sépare les paragraphes conservés les uns des autres par une seule ligne vide, et ne renvoie rien d'autre que ce texte nettoyé — aucun commentaire, aucune introduction.

Texte à nettoyer :
{context}
`)

const messageContentToText = (content: unknown): string =>
  typeof content === 'string' ? content : String(content)

export const cleanBookText = async (rawText: string): Promise<string> => {
  if (!rawText.trim()) return ''

  const prompt = await contextCleanupPromptTemplate.format({
    context: rawText,
  })

  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  })

  const result = await model.invoke([{ role: 'user', content: prompt }])
  return messageContentToText(result.content)
}
