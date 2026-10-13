-- AlterTable
-- Generated column (STORED): recalculated automatically on every insert/update
-- of "content" — no separate backfill script to maintain, no risk of drift
-- from the embedding column it complements for sparse/lexical search.
ALTER TABLE "BookChunk"
  ADD COLUMN "contentTsv" tsvector GENERATED ALWAYS AS (to_tsvector('french', "content")) STORED;

-- CreateIndex
CREATE INDEX "BookChunk_contentTsv_idx" ON "BookChunk" USING GIN ("contentTsv");
