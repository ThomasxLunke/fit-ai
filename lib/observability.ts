import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { CallbackHandler } from '@langfuse/langchain'
import { LangfuseClient } from '@langfuse/client'

// Shared across both the live Next.js app (registered once via
// instrumentation.ts, per Next's own convention) and standalone tsx
// scripts (which have no instrumentation.ts hook, so they call
// initObservability() themselves). Idempotent so it's safe to call from
// both places without double-registering the tracer provider.
export const langfuseSpanProcessor = new LangfuseSpanProcessor()

let initialized = false
export function initObservability(): void {
  if (initialized) return
  initialized = true
  new NodeTracerProvider({ spanProcessors: [langfuseSpanProcessor] }).register()
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
  await langfuseSpanProcessor.forceFlush()
}
