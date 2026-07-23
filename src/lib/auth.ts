import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { authorizeCredentials } from '@/lib/credentials-authorize'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: authorizeCredentials,
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
      // Google is Parent-only; the Teacher approval gate lives in the
      // Credentials authorize() (distinguishable pending/rejected codes) and,
      // for already-issued sessions, in the (teacher)/layout.tsx status check.
      const dbUser = await db.user.findUnique({ where: { email } })
      if (!dbUser) return false
      if (account?.provider === 'google' && dbUser.role !== 'PARENT') return false
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
