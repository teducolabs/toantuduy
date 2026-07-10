import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string; email: string } & DefaultSession['user']
  }
}

// The JWT type lives in '@auth/core/jwt', a transitive dependency pnpm does not
// hoist to the app's node_modules — augmenting it here would create a disconnected
// shadow declaration rather than merging with next-auth's actual JWT type. `token`
// fields are cast at each read/write site in auth.ts instead.
