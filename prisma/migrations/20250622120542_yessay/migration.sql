/*
  Warnings:

  - A unique constraint covering the columns `[programId]` on the table `TrainingSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TrainingSession_programId_key" ON "TrainingSession"("programId");
