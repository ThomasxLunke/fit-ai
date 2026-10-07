import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@arizeai/phoenix-otel'
import { CallbackHandler } from '@langfuse/langchain'
import { LangfuseClient } from '@langfuse/client'

// Shared across both the live Next.js app (registered once via
// instrumentation.ts, per Next's own convention) and standalone tsx
// scripts (which have no instrumentation.ts hook, so they call
// initObservability() themselves). Idempotent so it's safe to call from
// both places without double-registering the tracer provider.
export const langfuseSpanProcessor = new LangfuseSpanProcessor()

// Dual-export to Phoenix via a second processor on the SAME tracer
// provider, rather than calling @arizeai/phoenix-otel's own register()
// (which would create and globally register its own competing
// NodeTracerProvider — OTel only supports one global provider). This way
// every span already created for Langfuse (the LangChain callback calls
// in lib/ai.ts, the manual retriever/embedding spans in
// lib/retrieval.ts) exports to Phoenix too, with no second instrumentation
// pass. Phoenix's local Docker container exposes OTLP/HTTP on 6006 (the
// same port as its UI) at the standard /v1/traces path.
const phoenixSpanProcessor = new BatchSpanProcessor(
  new OTLPTraceExporter({ url: 'http://localhost:6006/v1/traces' }),
)

let initialized = false
export function initObservability(): void {
  if (initialized) return
  initialized = true
  new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor, phoenixSpanProcessor],
  }).register()
}

let handler: CallbackHandler | undefined
export function getLangfuseHandler(): CallbackHandler {
  initObservability()
  if (!handler) handler = new CallbackHandler()
  return handler
}

// Prompt management, datasets/scores (@langfuse/client) are intentionally
// separate from tracing (@langfuse/tracing + @langfuse/otel) in Langfuse's
// own package split — kept here anyway since this app has exactly one of
// each and a single Langfuse wiring module is simpler than two.
let client: LangfuseClient | undefined
export function getLangfuseClient(): LangfuseClient {
  if (!client) client = new LangfuseClient()
  return client
}

// tsx scripts are short-lived and exit right after their one real call —
// without an explicit flush, buffered spans never reach Langfuse (see
// @langfuse/otel's README: "Spans still buffered when the process exits
// are lost").
export async function shutdownObservability(): Promise<void> {
  await Promise.all([
    langfuseSpanProcessor.forceFlush(),
    phoenixSpanProcessor.forceFlush(),
  ])
}
