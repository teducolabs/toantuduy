-- DropIndex
DROP INDEX "ClassMembership_classId_childProfileId_key";

-- AlterTable
ALTER TABLE "ClassMembership" ADD COLUMN "teacherAccountId" TEXT;

-- Backfill teacherAccountId from the owning Class
UPDATE "ClassMembership" cm
SET "teacherAccountId" = c."teacherAccountId"
FROM "Class" c
WHERE cm."classId" = c."id";

-- AlterTable
ALTER TABLE "ClassMembership" ALTER COLUMN "teacherAccountId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClassMembership_teacherAccountId_childProfileId_key" ON "ClassMembership"("teacherAccountId", "childProfileId");

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_teacherAccountId_fkey" FOREIGN KEY ("teacherAccountId") REFERENCES "TeacherAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
