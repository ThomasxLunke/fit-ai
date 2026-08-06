# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Fit-AI is a Next.js (App Router) app that generates a personalized workout program. During onboarding, the browser uses the webcam plus TensorFlow BodyPix pose segmentation to estimate the user's limb-length ratios (arm, leg, torso), then sends those ratios along with training preferences to an LLM (via LangChain + OpenAI) to generate a structured training program, which is persisted via Prisma/Postgres.

Most UI text and prompt content is in French.

## Commands

```bash
npm run dev      # prisma generate + next dev --turbopack
npm run build    # next build
npm run start    # next start
npm run lint     # next lint
```

There is no test suite configured in this repo.

Prisma:
```bash
npx prisma migrate dev --name <name>   # create/apply a migration after editing prisma/schema.prisma
npx prisma generate                     # regenerate the client (also runs on postinstall and npm run dev)
npx prisma studio                       # inspect the database
```

The Prisma client is generated into `lib/generated/prisma` (a custom `output` in `prisma/schema.prisma`), not the default `node_modules/.prisma`. This generated folder is gitignored — always import the client via `lib/db.ts` (`import prisma from '@/lib/db'`), never from `lib/generated/prisma` directly, and run `npx prisma generate` after pulling schema changes or cloning.

Required env vars (see `.env`): `DATABASE_URL` (Postgres), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENAI_API_KEY`, `VECTOR_STORE_ID`.

## Architecture

**Auth**: [better-auth](lib/auth.ts) with the Prisma adapter, email/password only. `auth.api.getSession({ headers })` reads the session server-side. The `User` model has a custom `onboarded` boolean field (`better-auth` `additionalFields`, `input: false` so it can't be set at signup). [middleware.ts](middleware.ts) gates every non-static route behind a session cookie (redirects to `/sign-in`) and bounces `/` to `/dashboard`; it does not check `onboarded` — that check happens in the dashboard page itself (`redirect('/onboarding')` if `!user.onboarded`).

Note there are two near-duplicate `getUserBySessionAuth` helpers: [lib/auth.ts](lib/auth.ts) (server-only, eagerly includes `program.trainingSessions.exercises`) and [app/actions/index.ts](app/actions/index.ts) (a `'use server'` action, no includes, callable from client components like the onboarding form). Pick the one that matches where you're calling from — the dashboard page uses the `lib/auth.ts` version, client components use the server action.

**Data model** ([prisma/schema.prisma](prisma/schema.prisma)): `User` 1:1 `Program` 1:N `TrainingSession` 1:N `Exercise`. Every `Exercise` carries its own LLM-generated justification fields (`reason`, `sourceBook`, `sourcePage`, `sourceExcerpt`) — these are shown on the dashboard as citations for why that exercise was picked. `Session`/`Account`/`Verification` are better-auth's own tables (`@@map`-ed to lowercase).

**Onboarding flow** ([components/onboarding-form.tsx](components/onboarding-form.tsx)):
1. A multi-step wizard collects `sessionPerWeek`, `dayAvailable`, `objective`, `programPreferences`, then three body-measurement steps (arm, leg, torso).
2. For each measurement step, `react-webcam` streams into a `<video>`, and BodyPix (`segmentPersonParts`, loaded once into `modelRef`) runs on a 100ms interval, computing a keypoint-distance ratio per frame (e.g. shoulder→elbow vs elbow→wrist for the arm) and collecting up to 100 samples client-side (`measurementArm/Leg/Torso` state). The step's "Next" is disabled until 100 samples are collected. `currentStep` gates which keypoints are read inside the shared `detect()` function — extending this wizard means threading a new `currentStep` branch through `detect()`, not just the JSX.
3. On submit, the 100 samples per limb are averaged (`lib/utils.ts#average`) into single ratios and sent to `generateProgram` in [lib/ai.ts](lib/ai.ts).
4. `generateProgram` pulls reference text from an OpenAI vector store (`queryVectorStore`, raw REST calls to `api.openai.com/v1/vector_stores`), interpolates the user's ratios/preferences/context into a French prompt template, and calls `ChatOpenAI(...).withStructuredOutput(schemaProgram)` (LangChain) to get back a typed `Program` tree.
5. The client then POSTs the generated program to `/api/program` to persist it, and PATCHes the user to `onboarded: true` via `/api/user/[id]`.

**API routes** (`app/api/**`) are thin: they read the session (or trust a client-supplied `userId`/`userData` body — there is no server-side ownership check on these routes) and do a Prisma read/write. `app/api/program/route.ts` fans out `TrainingSession`/`Exercise` creation from a full `schemaProgram` payload.

**Validation schemas**: [lib/schema.ts](lib/schema.ts) (`schemaProgram`/`schemaTrainingSession`/`schemaExercise`) is the shape returned by the LLM and persisted to the DB — it's the contract between `lib/ai.ts`, the `/api/program` route, and the Prisma models. It's separate from the onboarding wizard's own `formSchema` in `onboarding-form.tsx`.

**UI**: shadcn/ui ("new-york" style, Tailwind v4, zinc base) in `components/ui`, configured via [components.json](components.json). Path alias `@/*` → repo root ([tsconfig.json](tsconfig.json)). The `(dashboard)` route group wraps authenticated pages in a sidebar layout (`components/sidebar-dashboard.tsx` + shadcn `Sidebar`).

## Conventions

- No semicolons, single quotes ([.prettierrc](.prettierrc)).
- Lint via `next lint` / `eslint-config-next` ([eslint.config.mjs](eslint.config.mjs)) — no custom rules beyond the Next.js defaults.
