"""Run with: eval/.venv/Scripts/python.exe eval/run_ragas_eval.py --run-id <id> --target <exercise|topic|golden> [...]

Pulls Langfuse observations written by lib/ai.ts's generateProgram() for
ONE specific run, scores each with RAGAS's reference-free metrics, and
writes the scores back onto the matching Langfuse observation via
create_score() — so they show up in Langfuse's UI attached to the exact
span that produced them.

Two independent observation families can be evaluated, selected via
--target (both at once is supported — each gets its own averages block and
its own score write-back):
  - "exercise": "exercise-justification-<run-id>" spans, one per generated
    exercise, question reconstructed after generation (see lib/ai.ts).
  - "topic": "topic-retrieval-<run-id>" spans, one per retrieval tag (see
    lib/retrieval.ts's buildTopicQueries()) — scores the actual query that
    drove retrieval, rather than a question rebuilt after the fact. Only
    present when generateProgram() was called with evalMode: true (see
    scripts/test-generate-program.ts).
Both are shaped identically, {question, contexts, answer}, which is why one
fetch/evaluate/write-back pipeline (run_eval() below) serves both.

A third, separate target:
  - "golden": reuses the same "topic-retrieval-<run-id>" spans as "topic",
    but only for the handful of tags that have a hand-written reference
    answer in golden_dataset.json (see run_golden_eval() below) — scored
    with RAGAS's reference-based metrics (LLMContextRecall,
    AnswerCorrectness) instead of the reference-free ones, since a real
    ground-truth answer is now available to compare against. Tags with no
    reference yet (empty string in golden_dataset.json) are skipped with a
    warning, not scored against an empty string.

--run-id is required (not optional, no silent default): generateProgram()
tags every span it creates with a run id (random unless the caller passes
one — see scripts/test-generate-program.ts's --run-id flag), so a run id
scopes evaluation to one specific generation instead of every span of that
family ever created across every test run. Run
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
    AnswerCorrectness,
    Faithfulness,
    LLMContextPrecisionWithoutReference,
    LLMContextRecall,
    ResponseRelevancy,
)

JUDGE_MODEL = "gpt-4o-mini" 
SPAN_NAME_PREFIX_BY_TARGET = {
    "exercise": "exercise-justification",
    "topic": "topic-retrieval",
}

GOLDEN_DATASET_PATH = Path(__file__).resolve().parent / "golden_dataset.json"

# .env lives at the repo root, one level up from eval/.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def fetch_observations(run_id: str, span_name: str) -> list[dict]:
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
                "name": span_name,
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


def run_eval(langfuse: Langfuse, run_id: str, target: str) -> None:
    span_name = f"{SPAN_NAME_PREFIX_BY_TARGET[target]}-{run_id}"
    raw_observations = fetch_observations(run_id, span_name)
    print(f"\n[{target}] Found {len(raw_observations)} observations ({span_name}).")
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
    print(f"=== {target} — Averages ===")
    for name in metric_names:
        print(f"  {name}: {df[name].mean():.3f}")

    print(f"Writing {target} scores back to Langfuse...")
    for obs, (_, row) in zip(raw_observations, df.iterrows()):
        for name in metric_names:
            langfuse.create_score(
                name=name,
                value=float(row[name]),
                trace_id=obs["traceId"],
                observation_id=obs["id"],
            )
    print(f"Done. Attached {len(metric_names)} scores to {len(raw_observations)} observations.")


def load_golden_dataset() -> dict:
    with open(GOLDEN_DATASET_PATH, encoding="utf-8") as f:
        return json.load(f)


def run_golden_eval(langfuse: Langfuse, run_id: str) -> None:
    span_name = f"{SPAN_NAME_PREFIX_BY_TARGET['topic']}-{run_id}"
    raw_observations = fetch_observations(run_id, span_name)
    golden = load_golden_dataset()

    matched_observations = []
    samples = []
    for obs in raw_observations:
        tag = obs["metadata"].get("tag")
        entry = golden.get(tag)
        if not entry:
            continue
        reference = entry.get("reference", "")
        if not reference:
            print(f"[golden] Skipping tag '{tag}': no reference answer written yet "
                  f"in {GOLDEN_DATASET_PATH.name}.")
            continue

        input_data = json.loads(obs["input"])
        output_data = json.loads(obs["output"])
        matched_observations.append(obs)
        samples.append(
            SingleTurnSample(
                user_input=input_data["question"],
                retrieved_contexts=input_data["contexts"],
                response=output_data["answer"],
                reference=reference,
            )
        )

    print(f"\n[golden] Matched {len(samples)}/{len(golden)} golden tags "
          f"({span_name}).")
    if not samples:
        return

    dataset = EvaluationDataset(samples=samples)
    judge_llm = LangchainLLMWrapper(ChatOpenAI(model=JUDGE_MODEL))

    metrics = [LLMContextRecall(), AnswerCorrectness()]

    run_config = RunConfig(timeout=600, max_workers=4)
    result = evaluate(dataset=dataset, metrics=metrics, llm=judge_llm, run_config=run_config)
    df = result.to_pandas()

    metric_names = [m.name for m in metrics]
    print("=== golden — Per-tag scores ===")
    for obs, (_, row) in zip(matched_observations, df.iterrows()):
        tag = obs["metadata"]["tag"]
        scores = ", ".join(f"{name}={row[name]:.3f}" for name in metric_names)
        print(f"  [{tag}] {scores}")

    print("=== golden — Averages ===")
    for name in metric_names:
        print(f"  {name}: {df[name].mean():.3f}")

    print("Writing golden scores back to Langfuse...")
    for obs, (_, row) in zip(matched_observations, df.iterrows()):
        for name in metric_names:
            langfuse.create_score(
                name=name,
                value=float(row[name]),
                trace_id=obs["traceId"],
                observation_id=obs["id"],
            )
    print(f"Done. Attached {len(metric_names)} scores to {len(matched_observations)} observations.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--run-id",
        required=True,
        help="Run id printed by scripts/test-generate-program.ts's "
        '"Run id: ..." line — scopes evaluation to that one run.',
    )
    parser.add_argument(
        "--target",
        nargs="+",
        choices=sorted(SPAN_NAME_PREFIX_BY_TARGET) + ["golden"],
        required=True,
        help="Which observation family to evaluate — 'exercise', 'topic', "
        "'golden' (reference-based metrics on the few tags with a hand-"
        "written answer in golden_dataset.json), or several at once "
        "('--target exercise topic golden') to run them one after the "
        "other in this same invocation.",
    )
    args = parser.parse_args()

    langfuse = Langfuse()
    for target in args.target:
        if target == "golden":
            run_golden_eval(langfuse, args.run_id)
        else:
            run_eval(langfuse, args.run_id, target)
    langfuse.flush()


if __name__ == "__main__":
    main()
