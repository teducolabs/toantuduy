import { z } from 'zod'

const envSchema = z.object({
  // Database — two connections, NOT interchangeable
  // DATABASE_URL is migrations-only (prisma migrate / prisma db seed). NEVER import at runtime.
  DATABASE_URL: z.string().url(),
  // DATABASE_URL_POOLED is used for ALL runtime DB access (Supabase PgBouncer)
  DATABASE_URL_POOLED: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Google OAuth (Parent accounts only)
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().startsWith('re_'),

  // PayOS (Vietnamese payment gateway)
  PAYOS_CLIENT_ID: z.string().min(1),
  PAYOS_API_KEY: z.string().min(1),
  PAYOS_CHECKSUM_KEY: z.string().min(1), // used for HMAC-SHA256 webhook verification

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
