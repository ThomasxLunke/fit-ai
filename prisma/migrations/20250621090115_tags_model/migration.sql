/*
  Warnings:

  - Added the required column `reason` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceBook` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceExcerpt` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourcePage` to the `Exercise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `day` to the `TrainingSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "sourceBook" TEXT NOT NULL,
ADD COLUMN     "sourceExcerpt" TEXT NOT NULL,
ADD COLUMN     "sourcePage" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "day" TEXT NOT NULL;
