-- AlterTable
ALTER TABLE "AssignmentSet" ADD COLUMN     "replacedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "assignmentSetId" TEXT;

-- AlterTable
ALTER TABLE "TeacherAccount" ADD COLUMN     "fullName" TEXT;

-- CreateIndex
CREATE INDEX "AssignmentSet_classId_assignedAt_idx" ON "AssignmentSet"("classId", "assignedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_assignmentSetId_fkey" FOREIGN KEY ("assignmentSetId") REFERENCES "AssignmentSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
