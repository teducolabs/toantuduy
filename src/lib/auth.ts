import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

// Fixed-cost dummy hash so a lookup miss still pays the bcrypt.compare cost —
// otherwise response timing reveals whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', 10)

// Distinguishable error code for AC #5's specific message — see next-auth's
// CredentialsSignin subclassing mechanism.
class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') {
          return null
        }
        const email = credentials.email.trim().toLowerCase()
        const user = await db.user.findUnique({ where: { email } })
        const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH)
        if (!user?.passwordHash || !valid) return null
        if (!user.emailVerified) throw new EmailNotVerifiedError()
        return { id: user.id, email: user.email, role: user.role }
      },
    }),
    Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false
      if (account?.provider === 'google' && (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) {
        return false
      }
      const email = user.email.trim().toLowerCase()
      // Single lookup serves both the Google-Parent-only check (AC #3) and the
      // Teacher-approval check (AC #4) — status re-checked here regardless of provider.
      const dbUser = await db.user.findUnique({
        where: { email },
        include: { teacherAccount: true },
      })
      if (!dbUser) return false
      if (account?.provider === 'google' && dbUser.role !== 'PARENT') return false
      if (dbUser.role === 'TEACHER' && dbUser.teacherAccount?.status !== 'APPROVED') return false
      // Attach the real DB id/role onto the user object — for the Google provider,
      // `user` is otherwise just the raw OAuth profile (no role, provider-subject id).
      user.id = dbUser.id
      ;(user as { role?: string }).role = dbUser.role
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: string }).role
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
