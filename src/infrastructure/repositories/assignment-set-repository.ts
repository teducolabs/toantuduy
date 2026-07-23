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
