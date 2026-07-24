import { db } from '@/lib/db'
import type { Class, ClassMembership, GradeBand } from '@prisma/client'

export type ClassWithStudentCount = Class & {
  _count: { memberships: number }
  assignmentSets: { title: string }[]
}

export type ClassDetail = Class & {
  memberships: { id: string; childProfile: { id: string; name: string; gradeBand: GradeBand } }[]
  assignmentSets: { id: string; title: string }[]
}

export function listClassesForTeacher(teacherAccountId: string): Promise<ClassWithStudentCount[]> {
  return db.class.findMany({
    where: { teacherAccountId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { memberships: true } },
      assignmentSets: { where: { assignedAt: { not: null }, replacedAt: null }, select: { title: true }, take: 1 },
    },
  })
}

// Ownership check for assign targets: all classIds must belong to the teacher.
export function countClassesForTeacher(classIds: string[], teacherAccountId: string): Promise<number> {
  return db.class.count({ where: { id: { in: classIds }, teacherAccountId } })
}

export function createClass(teacherAccountId: string, name: string, gradeBand: GradeBand, joinCode: string): Promise<Class> {
  return db.class.create({
    data: { teacherAccountId, name, gradeBand, joinCode },
  })
}

export function getClassDetail(classId: string, teacherAccountId: string): Promise<ClassDetail | null> {
  return db.class.findFirst({
    where: { id: classId, teacherAccountId },
    include: {
      memberships: {
        where: { childProfile: { deletedAt: null } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          childProfile: { select: { id: true, name: true, gradeBand: true } },
        },
      },
      // Active set (5.6 D5): the class detail page links to its class report.
      assignmentSets: { where: { assignedAt: { not: null }, replacedAt: null }, select: { id: true, title: true }, take: 1 },
    },
  })
}

export function findClassByJoinCode(joinCode: string): Promise<Class | null> {
  return db.class.findUnique({
    where: { joinCode },
  })
}

export function createClassMembership(classId: string, childProfileId: string, teacherAccountId: string): Promise<ClassMembership> {
  return db.classMembership.create({
    data: { classId, childProfileId, teacherAccountId },
  })
}
