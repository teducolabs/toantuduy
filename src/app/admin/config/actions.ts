'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/app/admin/actions'
import {
  getSessionQuestionCount,
  getSessionTimeLimitMinutes,
  setSessionQuestionCount,
  setSessionTimeLimitMinutes,
} from '@/infrastructure/repositories/global-config-repository'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

export async function getSessionConfigAction(): Promise<
  ActionResult<{ questionCount: number; timeLimitMinutes: number | null }>
> {
  const resolved = await requireAdmin()
  if ('error' in resolved) return resolved

  try {
    const [questionCount, timeLimitMinutes] = await Promise.all([
      getSessionQuestionCount(),
      getSessionTimeLimitMinutes(),
    ])
    return { data: { questionCount, timeLimitMinutes } }
  } catch {
    return { error: { code: 'LOAD_FAILED', message: 'Could not load session configuration' } }
  }
}

const saveSchema = z.object({
  questionCount: z.number().int().min(5).max(30),
  timeLimitMinutes: z.number().int().min(1).max(180).nullable(),
})

export async function saveSessionConfigAction(input: {
  questionCount: number
  timeLimitMinutes: number | null
}): Promise<ActionResult<{ questionCount: number; timeLimitMinutes: number | null }>> {
  const resolved = await requireAdmin()
  if ('error' in resolved) return resolved

  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  try {
    // Both keys always written (D7): the time-limit row stores '0' when disabled.
    await setSessionQuestionCount(parsed.data.questionCount)
    await setSessionTimeLimitMinutes(parsed.data.timeLimitMinutes)

    revalidatePath('/admin/config')
    return { data: parsed.data }
  } catch {
    return { error: { code: 'SAVE_FAILED', message: 'Could not save session configuration' } }
  }
}
