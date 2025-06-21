/*
  Warnings:

  - The primary key for the `Exercise` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Program` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Program` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `TrainingSession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `TrainingSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `session` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `trainingSessionId` on the `Exercise` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `programId` on the `TrainingSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_trainingSessionId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_programId_fkey";

-- AlterTable
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "trainingSessionId",
ADD COLUMN     "trainingSessionId" INTEGER NOT NULL,
ADD CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Program" DROP CONSTRAINT "Program_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Program_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "programId",
ADD COLUMN     "programId" INTEGER NOT NULL,
ADD CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "session" DROP CONSTRAINT "session_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "session_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
