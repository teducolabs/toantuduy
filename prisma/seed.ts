// Dev-only sample accounts — NOT for production. Full corpus seed (questions/skills)
// is Story 7.5's scope; this covers auth/role smoke-testing accounts plus a minimal
// dev/test Question corpus (this story) so the practice flow has data to work with.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'

const db = new PrismaClient()

const SAMPLE_PASSWORD = 'Password123!'

// v1 Skill Enumeration — see epics.md; code is the upsert key.
const SKILLS = [
  { code: 'pattern-recognition', name: 'Nhận diện quy luật' },
  { code: 'spatial-reasoning', name: 'Suy luận không gian' },
  { code: 'classification', name: 'Phân loại' },
  { code: 'word-problem', name: 'Đọc hiểu bài toán' },
]

interface QuestionFixture {
  skillCode: string
  gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3'
  difficultyLevel: number
  prompt: string
  imageUrl: string | null
  choices: string[]
  correctAnswer: string
}

async function seedSkills() {
  for (const skill of SKILLS) {
    await db.skill.upsert({
      where: { code: skill.code },
      update: { name: skill.name },
      create: skill,
    })
  }
}

function loadQuestionFixtures(): QuestionFixture[] {
  const fixturesDir = path.join(__dirname, 'fixtures')
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'))
  return files.flatMap((file) => JSON.parse(readFileSync(path.join(fixturesDir, file), 'utf-8')) as QuestionFixture[])
}

async function seedQuestions() {
  const fixtures = loadQuestionFixtures()
  const skills = await db.skill.findMany()
  const skillIdByCode = new Map(skills.map((s) => [s.code, s.id]))

  // Question.id has no natural business key to upsert on, so this dev/test-only
  // fixture corpus is seeded idempotently by clearing and recreating it on every
  // run rather than upserting individual rows (acceptable here per AD-12 — not
  // production content). Question has onDelete: Restrict from SessionAnswer and
  // AssignmentSetQuestion, so dependent dev/test rows are wiped first to keep
  // reseeding idempotent once session data exists.
  await db.sessionAnswer.deleteMany({})
  await db.assignmentSetQuestion.deleteMany({})
  await db.question.deleteMany({})

  for (const fixture of fixtures) {
    const skillId = skillIdByCode.get(fixture.skillCode)
    if (!skillId) throw new Error(`Unknown skillCode in fixture: ${fixture.skillCode}`)
    await db.question.create({
      data: {
        prompt: fixture.prompt,
        imageUrl: fixture.imageUrl,
        choices: fixture.choices,
        correctAnswer: fixture.correctAnswer,
        skillId,
        gradeBand: fixture.gradeBand,
        difficultyLevel: fixture.difficultyLevel,
      },
    })
  }
}

async function seedGlobalConfig() {
  const defaults = [
    { key: 'FREE_TIER_DAILY_ALLOTMENT', value: '5' },
    { key: 'SESSION_QUESTION_COUNT', value: '10' },
  ]
  for (const { key, value } of defaults) {
    await db.globalConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
}

async function seedParent(email: string) {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: 'PARENT', emailVerified: new Date() },
    create: { email, passwordHash, role: 'PARENT', emailVerified: new Date() },
  })
  // Clean up a stale TeacherAccount if this email was previously seeded under a different role.
  await db.teacherAccount.deleteMany({ where: { userId: user.id } })
  await db.parentAccount.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })
  return { email, role: 'PARENT', user }
}

async function seedTeacher(email: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: 'TEACHER', emailVerified: new Date() },
    create: { email, passwordHash, role: 'TEACHER', emailVerified: new Date() },
  })
  // Clean up a stale ParentAccount if this email was previously seeded under a different role.
  await db.parentAccount.deleteMany({ where: { userId: user.id } })
  await db.teacherAccount.upsert({
    where: { userId: user.id },
    update: { status },
    create: { userId: user.id, schoolName: 'Trường Mẫu', gradeTaught: 'GRADE_1', status },
  })
  return { email, role: `TEACHER (${status})`, user }
}

async function seedAdmin(email: string) {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', emailVerified: new Date() },
    create: { email, passwordHash, role: 'ADMIN', emailVerified: new Date() },
  })
  // Clean up stale Parent/TeacherAccount rows if this email was previously seeded under a different role.
  await db.parentAccount.deleteMany({ where: { userId: user.id } })
  await db.teacherAccount.deleteMany({ where: { userId: user.id } })
  return { email, role: 'ADMIN', user }
}

async function main() {
  // Refuses to run against a production environment — these are dev-only
  // fixtures with a shared, publicly-known sample password.
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run the dev seed script with NODE_ENV=production.')
    process.exit(1)
  }

  const accounts = [
    await seedParent('parent@example.test'),
    await seedTeacher('teacher-approved@example.test', 'APPROVED'),
    await seedTeacher('teacher-pending@example.test', 'PENDING'),
    await seedTeacher('teacher-rejected@example.test', 'REJECTED'),
    await seedAdmin('admin@example.test'),
  ]

  await seedSkills()
  await seedQuestions()
  await seedGlobalConfig()

  console.log('Seed complete — sample accounts (password for all: %s):', SAMPLE_PASSWORD)
  for (const account of accounts) {
    console.log(`  ${account.role.padEnd(20)} ${account.email}`)
  }
  console.log('Seeded Skills, Question fixtures, and GlobalConfig defaults.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
