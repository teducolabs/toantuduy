import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyVerificationToken } from '@/lib/email-verification-token'
import { auth } from '@/locales/vi/auth'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token: rawToken } = await searchParams
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken
  const result = token ? verifyVerificationToken(token) : null

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <p role="alert">{auth.verifyLinkInvalid}</p>
      </main>
    )
  }

  try {
    await db.user.update({ where: { id: result.userId }, data: { emailVerified: new Date() } })
  } catch {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <p role="alert">{auth.verifyLinkInvalid}</p>
      </main>
    )
  }

  redirect('/login?verified=true')
}
