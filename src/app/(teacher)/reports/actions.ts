'use server'

import { z } from 'zod'
import { requireTeacherAccountId } from '../classes/actions'
import { getClassReportData } from '@/infrastructure/repositories/assignment-set-repository'
import { computeClassReport, type ClassReport } from '@/domain/use-cases/class-report'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

export type ClassReportWithHeader = ClassReport & {
  title: string
  className: string
  status: 'assigned' | 'replaced'
  dueAt: Date | null
  questionCount: number
}

// Exported for the client retry wrapper (class-report-content.tsx), the way
// 4.5 exported DashboardDataResult.
export type ClassReportResult = ActionResult<{ report: ClassReportWithHeader }>

const classReportSchema = z.object({ assignmentSetId: z.string().min(1) })

export async function getClassReportAction(input: { assignmentSetId: string }): Promise<ClassReportResult> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const parsed = classReportSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  // Actions never throw — a transient repo failure becomes LOAD_FAILED so the
  // client retry card can handle it (UX-DR15). Gate + validation stay outside.
  try {
    const reportData = await getClassReportData(parsed.data.assignmentSetId, resolved.teacherAccountId)
    if (!reportData) {
      return { error: { code: 'NOT_FOUND', message: 'Assignment set not found' } }
    }

    // All aggregation happens in the pure domain use case (D7); dates cross the
    // domain boundary as ISO strings, never Prisma Date types.
    const computed = computeClassReport({
      students: (reportData.class?.memberships ?? []).map((membership) => membership.childProfile),
      skills: reportData.questions.map((row) => row.question.skill),
      completedSessions: reportData.sessions.map((completedSession) => ({
        childProfileId: completedSession.childProfileId,
        completedAt: completedSession.completedAt?.toISOString() ?? '',
        answers: completedSession.answers
          .filter((answer) => answer.answeredCorrectly !== null)
          .map((answer) => ({ skillId: answer.question.skillId, answeredCorrectly: answer.answeredCorrectly === true })),
      })),
    })

    return {
      data: {
        report: {
          ...computed,
          title: reportData.title,
          className: reportData.class?.name ?? '',
          status: reportData.replacedAt !== null ? 'replaced' : 'assigned',
          dueAt: reportData.dueAt,
          questionCount: reportData.questions.length,
        },
      },
    }
  } catch {
    return { error: { code: 'LOAD_FAILED', message: 'Could not load report' } }
  }
}
