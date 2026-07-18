export type GradeBand = 'GRADE_1' | 'GRADE_2' | 'GRADE_3'

export interface ChildProfile {
  id: string
  parentAccountId: string
  name: string
  gradeBand: GradeBand
}
