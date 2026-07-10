// Dev-only sample accounts — NOT for production. Full corpus seed (questions/skills)
// is Story 7.5's scope; this covers auth/role smoke-testing accounts only.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const SAMPLE_PASSWORD = 'Password123!'

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

  console.log('Seed complete — sample accounts (password for all: %s):', SAMPLE_PASSWORD)
  for (const account of accounts) {
    console.log(`  ${account.role.padEnd(20)} ${account.email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
