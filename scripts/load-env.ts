import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Standalone scripts run via `tsx`, outside Next's build pipeline, so `.env`
// isn't loaded automatically the way `next dev`/`next build` does it.
export function loadEnv(path = resolve(process.cwd(), '.env')) {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    if (isQuoted) value = value.slice(1, -1)

    if (!(key in process.env)) process.env[key] = value
  }
}
