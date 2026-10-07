"""Run with: eval/.venv/Scripts/python.exe eval/run_ragas_eval.py --run-id <id>

Pulls the "exercise-justification-<run-id>" observations written by
lib/ai.ts's generateProgram() for ONE specific run (one span per exercise,
shaped as {question, contexts, answer} — see the comment there for why
RAGAS is evaluated per-exercise rather than per-program), scores each with
RAGAS's reference-free metrics, and writes the scores back onto the
matching Langfuse observation via create_score() — so they show up in
Langfuse's UI attached to the exact span that produced them.

--run-id is required (not optional, no silent default): generateProgram()
tags every exercise span it creates with a run id (random unless the
caller passes one — see scripts/test-generate-program.ts's --run-id flag),
so a run id scopes evaluation to one specific generation instead of every
exercise-justification span ever created across every test run. Run
scripts/test-generate-program.ts first and copy the "Run id: ..." it
prints.

Real cost: one judge-LLM call per sample per metric (gpt-4o-mini) —
confirm before running, same posture as the TS test scripts' real-LLM-
cost gate.

Langfuse's self-hosted v4 "events_only" mode has no working trace/v1-
observations read API (confirmed: both return "not available ... events_only
mode") — the Python SDK's own read helpers (e.g. BatchEvaluationRunner)
hit the same wall. Fetching observations via a raw request to
GET /api/public/v2/observations (with ?fields=core,io,metadata to get the
input/output payloads) is the documented workaround, so that's what this
script does instead of the SDK's built-in batch-eval helpers.
"""

import argparse
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langfuse import Langfuse
from ragas import EvaluationDataset, RunConfig, SingleTurnSample, evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import (
    Faithfulness,
    LLMContextPrecisionWithoutReference,
    ResponseRelevancy,
)

JUDGE_MODEL = "gpt-4o-mini"  # cheaper than the gpt-6-sol generation model —
# scoring against a rubric is a simpler task than the citation-fidelity/
# instruction-following generation task that specifically required gpt-6-sol.

# .env lives at the repo root, one level up from eval/.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def fetch_exercise_justification_observations(run_id: str) -> list[dict]:
    base_url = os.environ["LANGFUSE_BASE_URL"]
    auth = (os.environ["LANGFUSE_PUBLIC_KEY"], os.environ["LANGFUSE_SECRET_KEY"])

    # /api/public/v2/observations' `meta` comes back empty ({}) rather than
    # the {page, totalPages, ...} shape the /v2/prompts endpoint returns —
    # page through on "got fewer than we asked for" instead of a page count.
    observations: list[dict] = []
    page = 1
    page_size = 100
    while True:
        res = requests.get(
            f"{base_url}/api/public/v2/observations",
            auth=auth,
            params={
                "name": f"exercise-justification-{run_id}",
                "fields": "core,io,metadata",
                "limit": page_size,
                "page": page,
            },
            timeout=30,
        )
        res.raise_for_status()
        batch = res.json()["data"]
        observations.extend(batch)
        if len(batch) < page_size:
            break
        page += 1

    return observations


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--run-id",
        required=True,
        help="Run id printed by scripts/test-generate-program.ts's "
        '"Run id: ..." line — scopes evaluation to that one run.',
    )
    args = parser.parse_args()

    langfuse = Langfuse()

    raw_observations = fetch_exercise_justification_observations(args.run_id)
    print(f"Found {len(raw_observations)} exercise-justification observations for run {args.run_id}.")
    if not raw_observations:
        return

    samples = []
    for obs in raw_observations:
        input_data = json.loads(obs["input"])
        output_data = json.loads(obs["output"])
        samples.append(
            SingleTurnSample(
                user_input=input_data["question"],
                retrieved_contexts=input_data["contexts"],
                response=output_data["answer"],
            )
        )

    dataset = EvaluationDataset(samples=samples)
    judge_llm = LangchainLLMWrapper(ChatOpenAI(model=JUDGE_MODEL))

    metrics = [Faithfulness(), ResponseRelevancy(), LLMContextPrecisionWithoutReference()]

    run_config = RunConfig(timeout=600, max_workers=4)
    result = evaluate(dataset=dataset, metrics=metrics, llm=judge_llm, run_config=run_config)
    df = result.to_pandas()

    metric_names = [m.name for m in metrics]
    print("\n=== Averages ===")
    for name in metric_names:
        print(f"  {name}: {df[name].mean():.3f}")

    print("\nWriting scores back to Langfuse...")
    for obs, (_, row) in zip(raw_observations, df.iterrows()):
        for name in metric_names:
            langfuse.create_score(
                name=name,
                value=float(row[name]),
                trace_id=obs["traceId"],
                observation_id=obs["id"],
            )
    langfuse.flush()
    print(f"Done. Attached {len(metric_names)} scores to {len(raw_observations)} observations.")


if __name__ == "__main__":
    main()
