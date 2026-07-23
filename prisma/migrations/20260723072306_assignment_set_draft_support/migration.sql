/*
  Warnings:

  - Added the required column `gradeBand` to the `AssignmentSet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AssignmentSet" ADD COLUMN     "gradeBand" "GradeBand" NOT NULL,
ALTER COLUMN "classId" DROP NOT NULL;
