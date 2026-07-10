-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3');

-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "parentAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "parentAccountId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "renewsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "gradeTaught" "GradeBand" NOT NULL,
    "status" "TeacherStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "teacherAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMembership" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "choices" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "difficultyLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "childProfileId" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answeredCorrectly" BOOLEAN,
    "difficultyLevelAtAnswer" INTEGER,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "SessionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSet" (
    "id" TEXT NOT NULL,
    "teacherAccountId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSetQuestion" (
    "id" TEXT NOT NULL,
    "assignmentSetId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "AssignmentSetQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAccount_userId_key" ON "ParentAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_parentAccountId_key" ON "Subscription"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAccount_userId_key" ON "TeacherAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_joinCode_key" ON "Class"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMembership_classId_childProfileId_key" ON "ClassMembership"("classId", "childProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE INDEX "Question_gradeBand_skillId_difficultyLevel_idx" ON "Question"("gradeBand", "skillId", "difficultyLevel");

-- CreateIndex
CREATE INDEX "Session_childProfileId_completedAt_idx" ON "Session"("childProfileId", "completedAt");

-- CreateIndex
CREATE INDEX "SessionAnswer_questionId_idx" ON "SessionAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSetQuestion_assignmentSetId_questionId_key" ON "AssignmentSetQuestion"("assignmentSetId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalConfig_key_key" ON "GlobalConfig"("key");

-- AddForeignKey
ALTER TABLE "ParentAccount" ADD CONSTRAINT "ParentAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAccount" ADD CONSTRAINT "TeacherAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherAccountId_fkey" FOREIGN KEY ("teacherAccountId") REFERENCES "TeacherAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAnswer" ADD CONSTRAINT "SessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAnswer" ADD CONSTRAINT "SessionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSet" ADD CONSTRAINT "AssignmentSet_teacherAccountId_fkey" FOREIGN KEY ("teacherAccountId") REFERENCES "TeacherAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSet" ADD CONSTRAINT "AssignmentSet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSetQuestion" ADD CONSTRAINT "AssignmentSetQuestion_assignmentSetId_fkey" FOREIGN KEY ("assignmentSetId") REFERENCES "AssignmentSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSetQuestion" ADD CONSTRAINT "AssignmentSetQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
