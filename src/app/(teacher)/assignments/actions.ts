'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireTeacherAccountId } from '../classes/actions'
import {
  createAssignmentSetDraft,
  listAssignmentSetsForTeacher,
  type AssignmentSetWithMeta,
} from '@/infrastructure/repositories/assignment-set-repository'
import {
  listQuestionsForLibrary,
  listSkills,
  countQuestionsInGradeBand,
  type QuestionLibraryItem,
} from '@/infrastructure/repositories/question-repository'
import { getSessionQuestionCount } from '@/infrastructure/repositories/global-config-repository'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

export async function getAssignmentBuilderContextAction(): Promise<
  ActionResult<{ skills: { id: string; code: string; name: string }[]; maxQuestions: number }>
> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const [skills, maxQuestions] = await Promise.all([listSkills(), getSessionQuestionCount()])
  return { data: { skills, maxQuestions } }
}

const questionLibrarySchema = z.object({
  gradeBand: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3']),
  skillId: z.string().min(1).optional(),
})

export async function getQuestionLibraryAction(input: {
  gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3'
  skillId?: string
}): Promise<ActionResult<{ questions: QuestionLibraryItem[] }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const parsed = questionLibrarySchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const questions = await listQuestionsForLibrary(parsed.data)
  return { data: { questions } }
}

const createDraftSchema = z.object({
  title: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
  gradeBand: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3']),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
  questionIds: z.array(z.string().min(1)).min(1, 'At least one question is required'),
})

export async function createAssignmentSetDraftAction(input: {
  title: string
  gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3'
  dueDate?: string
  questionIds: string[]
}): Promise<ActionResult<{ assignmentSet: { id: string } }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const parsed = createDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const questionIds = [...new Set(parsed.data.questionIds)]

  // The client cap (disabled checkboxes at max) is UX only — the admin-configured
  // count is re-read and re-enforced server-side (FR-20).
  const maxQuestions = await getSessionQuestionCount()
  if (questionIds.length > maxQuestions) {
    return { error: { code: 'TOO_MANY_QUESTIONS', message: `A set can hold at most ${maxQuestions} questions` } }
  }

  const matchingCount = await countQuestionsInGradeBand(questionIds, parsed.data.gradeBand)
  if (matchingCount !== questionIds.length) {
    return { error: { code: 'INVALID_QUESTIONS', message: 'Some questions do not exist or belong to another grade band' } }
  }

  const dueAt = parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T00:00:00.000Z`) : null

  try {
    const created = await createAssignmentSetDraft(resolved.teacherAccountId, {
      title: parsed.data.title,
      gradeBand: parsed.data.gradeBand,
      dueAt,
      questionIds,
    })
    revalidatePath('/classes')
    revalidatePath('/assignments')
    return { data: { assignmentSet: { id: created.id } } }
  } catch {
    return { error: { code: 'CREATE_FAILED', message: 'Could not create assignment set' } }
  }
}

export async function getAssignmentSetsAction(): Promise<ActionResult<{ assignmentSets: AssignmentSetWithMeta[] }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const assignmentSets = await listAssignmentSetsForTeacher(resolved.teacherAccountId)
  return { data: { assignmentSets } }
}
