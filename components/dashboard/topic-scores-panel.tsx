import type { TopicScore } from '@/lib/retrieval'

// Dev-only, ephemeral display for generateProgramAgentic()'s per-tag
// scores (see components/dashboard/program-generation-loader.tsx) — not
// persisted, just shown once on the generation screen. Color follows the
// same threshold the retrieval loop itself used to decide whether to
// retry (lib/retrieval.ts's SUFFICIENCY_THRESHOLD = 0.6), not a separate
// display-only scale.
export function TopicScoresPanel({
  topicScores,
}: {
  topicScores: TopicScore[]
}) {
  return (
    <ul className="lg-topic-scores">
      {topicScores.map((topic) => (
        <li
          key={topic.tag}
          className={
            topic.score >= 0.6
              ? 'lg-topic-score lg-topic-score-ok'
              : 'lg-topic-score lg-topic-score-low'
          }
        >
          <div className="lg-topic-score-head">
            <span className="lg-mono">{topic.tag}</span>
            <span className="lg-mono">
              {topic.score.toFixed(2)}
              {topic.tours > 1 ? ` · ${topic.tours} tours` : ''}
            </span>
          </div>
          <p className="lg-topic-score-reason">{topic.reason}</p>
        </li>
      ))}
    </ul>
  )
}
