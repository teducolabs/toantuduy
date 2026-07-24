import { db } from '@/lib/db'
import type { AssignmentSet, GradeBand } from '@prisma/client'

export type AssignmentSetWithMeta = AssignmentSet & {
  _count: { questions: number }
  class: { name: string } | null
}

// Draft semantics: classId and assignedAt are both omitted (null = draft).
// Nested create is atomic — the set and its join rows commit together.
export function createAssignmentSetDraft(
  teacherAccountId: string,
  { title, gradeBand, dueAt, questionIds }: { title: string; gradeBand: GradeBand; dueAt: Date | null; questionIds: string[] },
): Promise<AssignmentSet> {
  return db.assignmentSet.create({
    data: {
      teacherAccountId,
      title,
      gradeBand,
      dueAt,
      questions: { create: questionIds.map((questionId) => ({ questionId })) },
    },
  })
}

export function listAssignmentSetsForTeacher(teacherAccountId: string): Promise<AssignmentSetWithMeta[]> {
  return db.assignmentSet.findMany({
    where: { teacherAccountId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
      class: { select: { name: true } },
    },
  })
}

export type DraftSetWithQuestions = AssignmentSet & { questions: { questionId: string }[] }

// Ownership + draft check in one query: a foreign or already-assigned set both
// resolve to null (one SET_NOT_FOUND code — no information leak).
export function findDraftSetForTeacher(assignmentSetId: string, teacherAccountId: string): Promise<DraftSetWithQuestions | null> {
  return db.assignmentSet.findFirst({
    where: { id: assignmentSetId, teacherAccountId, assignedAt: null },
    include: { questions: { select: { questionId: true } } },
  })
}

export function findActiveSetsForClasses(classIds: string[]): Promise<{ id: string; classId: string | null; title: string }[]> {
  return db.assignmentSet.findMany({
    where: { classId: { in: classIds }, assignedAt: { not: null }, replacedAt: null },
    select: { id: true, classId: true, title: true },
  })
}

// D1/D2: assigning to N classes = assign the draft row to the first class and
// clone it for the rest; replacing supersedes (replacedAt), never deletes —
// all in ONE transaction so a class can never be left with nothing.
export async function assignSetToClasses(assignmentSetId: string, classIds: string[], questionIds: string[]): Promise<void> {
  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.assignmentSet.updateMany({
      where: { classId: { in: classIds }, assignedAt: { not: null }, replacedAt: null },
      data: { replacedAt: now },
    })
    const draft = await tx.assignmentSet.update({
      where: { id: assignmentSetId },
      data: { classId: classIds[0], assignedAt: now },
    })
    for (const classId of classIds.slice(1)) {
      await tx.assignmentSet.create({
        data: {
          teacherAccountId: draft.teacherAccountId,
          title: draft.title,
          gradeBand: draft.gradeBand,
          dueAt: draft.dueAt,
          classId,
          assignedAt: now,
          questions: { create: questionIds.map((questionId) => ({ questionId })) },
        },
      })
    }
  })
}

export type ActiveAssignmentForChild = {
  id: string
  title: string
  dueAt: Date | null
  teacherAccount: { fullName: string | null; schoolName: string }
}

export function getActiveAssignmentsForChild(childProfileId: string): Promise<ActiveAssignmentForChild[]> {
  return db.assignmentSet.findMany({
    where: {
      assignedAt: { not: null },
      replacedAt: null,
      class: { memberships: { some: { childProfileId } } },
    },
    orderBy: { assignedAt: 'desc' },
    select: {
      id: true,
      title: true,
      dueAt: true,
      teacherAccount: { select: { fullName: true, schoolName: true } },
    },
  })
}

// Authorization for session start: the set must be active AND the child must
// belong to its class. Question order is deterministic (D8).
export function findStartableAssignmentForChild(
  assignmentSetId: string,
  childProfileId: string,
): Promise<(AssignmentSet & { questions: { questionId: string }[] }) | null> {
  return db.assignmentSet.findFirst({
    where: {
      id: assignmentSetId,
      assignedAt: { not: null },
      replacedAt: null,
      class: { memberships: { some: { childProfileId } } },
    },
    include: { questions: { select: { questionId: true }, orderBy: { id: 'asc' } } },
  })
}
