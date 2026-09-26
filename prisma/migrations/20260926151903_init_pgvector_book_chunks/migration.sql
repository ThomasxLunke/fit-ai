-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public" VERSION "0.8.6";

-- CreateTable
CREATE TABLE "BookChunk" (
    "id" SERIAL NOT NULL,
    "book" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookChunk_book_idx" ON "BookChunk"("book");
