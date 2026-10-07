import { initObservability } from './lib/observability'

// Next.js convention: called once per server instance at startup, before
// any request handling — https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
export function register() {
  initObservability()
}
