// Vietnamese locale strings — Skill display names, keyed by canonical Skill
// code (epics.md "v1 Skill Enumeration"). The DB Skill.name copy is for
// joins/admin only; the student surface renders from here.
export const skills: Record<string, string> = {
  'pattern-recognition': 'Nhận diện quy luật',
  'spatial-reasoning': 'Suy luận không gian',
  classification: 'Phân loại',
  'word-problem': 'Đọc hiểu bài toán',
}

// Unknown/future skill codes fall back to the DB-provided name so a row
// never renders blank.
export function skillDisplayName(code: string, fallback: string): string {
  return skills[code] ?? fallback
}
