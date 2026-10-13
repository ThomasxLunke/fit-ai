# Learning Path — RAG de niveau production

Objectif explicite : ne pas optimiser pour le plus simple, mais pour ce qui a
la plus forte valeur signal — à la fois pour une vraie prod en entreprise et
pour briller en entretien. Classé par priorité Pareto : **Tier 1 = les 20%
qui couvrent 80% des attentes réelles**, à faire en premier. Tier 2/3 restent
au programme, juste après.

But final affiché : tout apprendre. Cette liste est un plan de route, pas un
menu — on coche au fur et à mesure (`- [ ]` → `- [x]`), on ne supprime rien.

Contexte : ce que le projet `fit-ai` couvre déjà au moment de l'écriture de
cette liste (2026-10-10) — voir [PROJECT_HISTORY.md](PROJECT_HISTORY.md) /
[PROJECT_HISTORY.html](PROJECT_HISTORY.html) pour le détail : ingestion
OCR+clean+chunking paragraphe-aware, embeddings OpenAI + pgvector, retrieval
multi-requêtes dense pur, génération structurée avec attribution source,
observabilité double (Langfuse + Phoenix), éval RAGAS sans référence
(Faithfulness, Response Relevancy, Context Precision without reference), RAG
agentique (boucle juge/reformulation/retry, pattern Corrective RAG
simplifié).

## Tier 1 — Priorité Pareto (à faire en premier)

Les compétences les plus universellement attendues sur un poste RAG en
entreprise, et les plus probables en entretien technique.

- [x] **Hybrid search** — combiner recherche dense (embeddings) et
  sparse/keyword (BM25 / full-text), fusionner les deux classements (ex.
  Reciprocal Rank Fusion). Comble les trous du dense pur (termes exacts,
  noms propres, références précises) que `lib/retrieval.ts` ne gère pas
  aujourd'hui. *Implémenté 2026-10-13 : full-text natif Postgres
  (`contentTsv`, GIN, config 'french') + RRF par rang dans
  `lib/retrieval.ts`.*
- [x] **Reranking** — un cross-encoder (Cohere Rerank, BGE-reranker, etc.)
  appliqué après le top-k vectoriel pour réordonner avant de couper au
  budget de tokens. Gain qualité souvent le plus simple à obtenir, jamais
  exploré ici. *Implémenté 2026-10-13 : Cohere Rerank (`rerank-v3.5`),
  `retrievalMode: 'dense' | 'hybrid'` conservé pour comparaison A/B.*
- [ ] **Golden dataset + métriques avec référence** — construire à la main
  un jeu de questions/réponses validées, puis mesurer Context Recall et
  Answer Correctness (RAGAS) en plus des 3 métriques sans référence déjà en
  place. Le vrai goulot d'étranglement en entreprise (effort humain de
  labellisation), donc une compétence rare et valorisée.
- [ ] **Permission-aware / multi-tenant retrieval** — filtrer les documents
  accessibles selon les droits de l'utilisateur au moment du retrieval.
  Central dès qu'il y a plusieurs utilisateurs/plusieurs niveaux d'accès
  (RH, legal, support client) — absent d'un projet mono-corpus/mono-usage
  comme celui-ci aujourd'hui.
- [ ] **Prompt injection via contenu retrievé** — comprendre et savoir
  mitiger le risque qu'un document indexé contienne du texte qui se fait
  passer pour une instruction. Sujet sécurité spécifique au RAG, de plus en
  plus demandé en entretien.

## Tier 2 — Haute valeur, deuxième vague

- [ ] Query transformation dynamique (HyDE, décomposition de question
  complexe, reformulation automatique d'une question libre — par
  opposition aux requêtes fixes actuelles de `buildTopicQueries`).
- [ ] Éval branchée en CI / tests de régression sur changement de prompt ou
  de chunking (seuil minimum avant merge).
- [ ] Éval en ligne / signal utilisateur (thumbs up/down, taux de
  régénération, taux d'abandon) en complément du juge LLM batch.
- [ ] Semantic caching (cache de résultats retrieval/génération sur
  questions sémantiquement proches, pas juste égalité exacte de clé).
- [ ] Prompt caching (OpenAI/Anthropic) sur la partie statique du prompt —
  gain coût/latence direct, non exploité actuellement.
- [ ] Tuning d'index vectoriel (HNSW vs IVFFlat sur pgvector) et choix d'un
  vector store dédié (Qdrant, Weaviate, Pinecone, Milvus) à l'échelle.
- [ ] Routing — décider *si* il faut retrieve et *où* (plusieurs
  index/sources), par opposition à une base unique toujours interrogée.
- [ ] Multi-hop agentique réel — une 2ᵉ recherche dont la requête dépend du
  *résultat* de la 1ʳᵉ (pas juste une reformulation de la même intention,
  contrairement à la boucle agentique actuelle).

## Tier 3 — Spécialisé / long tail

- [ ] Retrieval hiérarchique parent-child (petits chunks pour matcher, chunk
  parent plus large retourné comme contexte).
- [ ] Multi-vector retrieval (style ColBERT).
- [ ] Fine-tuning d'un modèle d'embedding sur le domaine ; distillation
  (juge gpt-4o-mini actuel → données d'entraînement pour un modèle plus
  petit).
- [ ] RAG multi-modal — pertinent spécifiquement ici : les PDFs source
  contiennent probablement des schémas d'exercices que l'OCR texte-only
  ignore complètement.
- [ ] Cycle de vie des données : ré-indexation incrémentale, déduplication,
  gestion des mises à jour/suppressions sans tout reconstruire.
- [ ] Streaming de la réponse générée (par opposition à l'`invoke` bloquant
  actuel).
- [ ] Agents avec tool-use au-delà du retrieval (calcul, appel API externe,
  choix dynamique de l'outil).

## Journal

- 2026-10-10 — Liste initiale créée après une discussion de bilan sur le
  projet. Tier 1 retenu comme point de départ (décision utilisateur :
  "commençons par les skills qui me mettent du bon côté de pareto").
- 2026-10-13 — Hybrid search + reranking implémentés (voir plan Phase 7,
  `mellow-exploring-tiger.md`). Leçon de prod imprévue : une clé Cohere
  Trial (10 appels/min) suffit à casser un run de 13 tags même en
  séquentialisant les appels — il a fallu passer en clé de production.
  Rappel concret que les limites de débit d'une API tierce sont une
  contrainte réelle d'architecture, pas un détail.
  Comparaison RAGAS dense vs hybride lancée en conditions réelles : signal
  **mixte**, pas de gain net démontré (Faithfulness +0.05, ResponseRelevancy
  -0.02, ContextPrecision -0.01) — et comparaison faussée par un bug annexe
  (flush Phoenix qui plantait le script, corrigé en `Promise.allSettled`
  dans `lib/observability.ts`) qui a fait tourner le run dense 3 fois sous
  le même id au lieu d'une. Décision : ne pas relancer maintenant, documenter
  tel quel. Leçon à retenir : un juge LLM seul sur ~13-39 échantillons est
  trop bruyant pour trancher un écart de cet ordre — ça pointe directement
  vers le prochain item Tier 1 (golden dataset + métriques avec référence)
  comme la vraie façon de mesurer un gain avec confiance.
  Suite à ça : décision explicite de repasser `'dense'` en défaut partout
  (`retrieveBookChunks`, `retrieveBookChunksAgentic`, `generateProgram`,
  `generateProgramAgentic`) — Cohere facture par appel et un run en fait
  13 à 26, ce qui n'a plus de sens par défaut sans gain démontré. `'hybrid'`
  reste disponible explicitement (`--hybrid` dans les deux scripts de
  test) pour l'apprentissage/comparaison, juste plus activé par défaut.
