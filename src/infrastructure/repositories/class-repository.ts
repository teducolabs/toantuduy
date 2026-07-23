import { db } from '@/lib/db'
import type { Class, ClassMembership, GradeBand } from '@prisma/client'

export type ClassWithStudentCount = Class & { _count: { memberships: number } }

export type ClassDetail = Class & {
  memberships: { id: string; childProfile: { id: string; name: string; gradeBand: GradeBand } }[]
}

export function listClassesForTeacher(teacherAccountId: string): Promise<ClassWithStudentCount[]> {
  return db.class.findMany({
    where: { teacherAccountId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { memberships: true } } },
  })
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
