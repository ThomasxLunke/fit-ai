import { PrismaClient } from './generated/prisma'

// Dedicated client for raw pgvector SQL on "BookChunk", deliberately not
// wrapped in withAccelerate() (see lib/db.ts) — Accelerate targets a
// prisma:// proxy connection, while DATABASE_URL here is a plain Railway
// postgresql:// URL, so a $queryRaw with a ::vector cast through that
// extension is unverified. This mirrors the same plain-client pattern
// already used by scripts/embed-and-store-chunks.ts. This does mean the
// app holds two separate connection pools against the same database (this
// one and lib/db.ts's) — fine at this app's scale, worth revisiting only
// if connection limits ever become a concern.
const globalForVectorDb = global as unknown as { vectorDb?: PrismaClient }

const vectorDb = globalForVectorDb.vectorDb ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForVectorDb.vectorDb = vectorDb

export default vectorDb
