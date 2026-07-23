import type { DashboardDataResult } from '@/app/(parent)/dashboard/actions'

export function shouldShowLoadErrorCard(result: DashboardDataResult): boolean {
  return 'error' in result
}
