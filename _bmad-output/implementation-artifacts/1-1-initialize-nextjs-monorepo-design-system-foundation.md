---
baseline_commit: 2c4fd806f5e189b2399c3dba492958d5d25bfa5e
---

# Story 1.1: Initialize Next.js Monorepo & Design System Foundation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the project scaffolded with the correct directory structure, brand design tokens, and validated env config,
So that all subsequent development starts from a convention-compliant foundation with no structural rework.

## Acceptance Criteria

1. **Given** Node.js and pnpm are installed, **When** I run `pnpm install` and `pnpm dev`, **Then** the Next.js 15 App Router dev server starts without errors.

2. **And** the directory structure matches the Architecture Spine exactly:
   - `src/app/(student)/`, `src/app/(parent)/`, `src/app/(teacher)/`, `src/app/admin/`, `src/app/api/`
   - `src/domain/entities/`, `src/domain/use-cases/`, `src/domain/constants.ts`
   - `src/infrastructure/repositories/`, `src/infrastructure/email/`, `src/infrastructure/storage/`, `src/infrastructure/payment/`
   - `src/components/ui/`, `src/components/student/`, `src/components/parent/`, `src/components/teacher/`
   - `src/lib/` containing `auth.ts`, `env.ts`, `utils.ts`, `child-profile-cookie.ts`
   - `src/locales/vi/` with an initial `common.ts` locale file
   - `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/fixtures/`

3. **And** Tailwind CSS v4 and shadcn/ui are installed and baselined.

4. **And** brand color tokens are defined as CSS custom properties overriding shadcn defaults (per DESIGN.md):
   - `primary` (#F97316 light / #FB923C dark)
   - `student-bg` (#FFF7ED light / #1C1007 dark)
   - `feedback-correct` (#16A34A light / #4ADE80 dark)
   - `feedback-incorrect` (#F87171 light / #FCA5A5 dark)
   - `skill-strong-bg` / `skill-strong-fg` token pairs
   - `skill-weak-bg` / `skill-weak-fg` token pairs
   - All with dark-mode variants.

5. **And** Be Vietnam Pro and Baloo 2 are loaded from Google Fonts; five typography tokens configured in Tailwind:
   - `display` — Baloo 2 700 / 36px / lh 1.15
   - `question` — Be Vietnam Pro 600 / 22px / lh 1.5
   - `label-student` — Be Vietnam Pro 600 / 18px / lh 1.4
   - `heading` — Be Vietnam Pro 700 / 20px / lh 1.3
   - `body` — Be Vietnam Pro 400 / 16px / lh 1.65

6. **And** custom border-radius tokens override shadcn defaults: `rounded-brand-sm` (8px), `rounded-brand-md` (12px), `rounded-brand-lg` (20px), `rounded-brand-xl` (28px).

7. **And** `src/lib/env.ts` exports Zod-validated env vars for all required secrets (`DATABASE_URL`, `DATABASE_URL_POOLED`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); the app fails to start if any required var is missing or invalid.

8. **And** `pnpm build` completes with zero TypeScript strict-mode errors; all file names are kebab-case.

## Tasks / Subtasks

- [x] **Task 1: Bootstrap Next.js 15 project** (AC: #1, #8)
  - [x] 1.1 — Run `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (or equivalent manual init for Next.js 15)
  - [x] 1.2 — Set `"strict": true` in `tsconfig.json`; confirm `"moduleResolution": "bundler"` is set
  - [x] 1.3 — Add `vercel.json` with `{ "regions": ["sin1"] }` to lock the Vercel deployment region to Singapore (irreversible — do this now)
  - [x] 1.4 — Configure `pnpm` workspace if necessary; verify `pnpm install` and `pnpm dev` work cleanly

- [x] **Task 2: Create full directory structure** (AC: #2)
  - [x] 2.1 — Create all route group directories under `src/app/`: `(student)/session/`, `(student)/summary/`, `(parent)/dashboard/`, `(parent)/profiles/`, `(parent)/subscription/`, `(teacher)/assignments/`, `(teacher)/classes/`, `(teacher)/reports/`, `admin/teachers/`, `admin/questions/`, `admin/config/`, `api/auth/[...nextauth]/`, `api/payments/payos/webhook/`
  - [x] 2.2 — Create `src/domain/entities/`, `src/domain/use-cases/`, and stub `src/domain/constants.ts` (export empty object or placeholder constants)
  - [x] 2.3 — Create `src/infrastructure/repositories/`, `src/infrastructure/email/resend.ts` (stub), `src/infrastructure/storage/supabase-storage.ts` (stub), `src/infrastructure/payment/payos.ts` (stub)
  - [x] 2.4 — Create `src/components/ui/` (shadcn output target), `src/components/student/`, `src/components/parent/`, `src/components/teacher/`
  - [x] 2.5 — Create `src/locales/vi/common.ts` (export empty object `{}` or a typed `Record<string, string>`)
  - [x] 2.6 — Create `prisma/fixtures/` directory with a `.gitkeep`
  - [x] 2.7 — Create stub `prisma/seed.ts` (empty main function)
  - [x] 2.8 — Verify all file and directory names are kebab-case

- [x] **Task 3: Install and configure Tailwind CSS v4 + shadcn/ui** (AC: #3)
  - [x] 3.1 — Ensure `tailwindcss@4` is installed (not v3); install `@tailwindcss/postcss` for the PostCSS integration
  - [x] 3.2 — Update `postcss.config.mjs` to use `@tailwindcss/postcss` plugin (Tailwind v4 drops the `tailwindcss` PostCSS plugin)
  - [x] 3.3 — Replace any `@tailwind base/components/utilities` directives in `globals.css` with `@import "tailwindcss"` (Tailwind v4 syntax)
  - [x] 3.4 — Run `npx shadcn@latest init` — accept defaults; shadcn will inject its CSS variable layer; confirm it resolves against Tailwind v4

- [x] **Task 4: Configure brand design tokens** (AC: #4, #5, #6)
  - [x] 4.1 — In `src/app/globals.css`, inside the `@layer base` / `:root` + `.dark` blocks, add all brand CSS custom properties (see Dev Notes for exact values)
  - [x] 4.2 — Configure the five typography utility classes in the Tailwind v4 `@theme` block (see Dev Notes for exact spec)
  - [x] 4.3 — Configure the four border-radius tokens (`--radius-brand-sm`, `--radius-brand-md`, `--radius-brand-lg`, `--radius-brand-xl`) and expose as `rounded-brand-*` utilities via `@theme`
  - [x] 4.4 — Wire Be Vietnam Pro and Baloo 2 via `next/font/google` in the root layout (`src/app/layout.tsx`) and inject the font CSS variables into the `<html>` className
  - [x] 4.5 — Verify dark-mode variants work by checking that `.dark` overrides in CSS apply the correct token values

- [x] **Task 5: Create env.ts with Zod validation** (AC: #7)
  - [x] 5.1 — Install `zod` if not already present
  - [x] 5.2 — Create `src/lib/env.ts` using `z.object({ ... }).parse(process.env)` pattern; include all 12 required env vars (see Dev Notes for full list)
  - [x] 5.3 — Create `.env.example` with all required keys (empty values) so future developers know what to set
  - [x] 5.4 — Ensure the app throws a clear error at startup if any var is missing

- [x] **Task 6: Create stub lib files** (AC: #2)
  - [x] 6.1 — Create `src/lib/auth.ts` (stub: export placeholder `authConfig = {}`)
  - [x] 6.2 — Create `src/lib/utils.ts` (stub: export `cn` using `clsx + tailwind-merge` as per shadcn convention)
  - [x] 6.3 — Create `src/lib/child-profile-cookie.ts` (stub: export typed but unimplemented `setChildProfileCookie` and `getChildProfileId` with `throw new Error('Not yet implemented')`)

- [x] **Task 7: Create stub Prisma schema** (AC: #2)
  - [x] 7.1 — Create `prisma/schema.prisma` with generator + datasource blocks pointing to `env("DATABASE_URL")` for migrations (full schema with all 13 entities is Story 1.2 — stub only here)
  - [x] 7.2 — Install `prisma` and `@prisma/client` dev deps; run `prisma generate` to confirm schema is valid

- [x] **Task 8: Build verification** (AC: #8)
  - [x] 8.1 — Run `pnpm build` and resolve any TypeScript strict-mode errors
  - [x] 8.2 — Confirm all filenames under `src/` and `prisma/` are kebab-case
  - [x] 8.3 — Run `pnpm dev` to confirm the dev server starts without errors

## Dev Notes

### Critical Architecture Guardrails for This Story

- **Greenfield project** — no existing code exists. Do not use a pre-existing starter template that might import incompatible versions.
- **Layer architecture is established now** — the directory structure IS the architecture enforcement. Create all directories even if stub files are empty.
- **No runtime import of `DATABASE_URL`** — only `DATABASE_URL_POOLED` is used at runtime (Story 1.2 sets this up; Story 1.1 just validates both vars exist in `env.ts`).
- **Vercel region `sin1` is irreversible** — add `vercel.json` with `{ "regions": ["sin1"] }` in Task 1.3. If this is missed, production latency from Vietnam will be significantly higher.
- **All filenames must be kebab-case** — Next.js App Router route files (`page.tsx`, `layout.tsx`, `loading.tsx`) are exempt (required by framework), but any custom file must follow kebab-case.

### Exact Directory Structure (Architecture Spine)

```text
src/
  app/
    (student)/
      session/
        page.tsx          ← stub: "Student session — coming soon"
      summary/
        page.tsx          ← stub
    (parent)/
      dashboard/
        page.tsx          ← stub
      profiles/
        page.tsx          ← stub
      subscription/
        page.tsx          ← stub
    (teacher)/
      assignments/
        page.tsx          ← stub
      classes/
        page.tsx          ← stub
      reports/
        page.tsx          ← stub
    admin/
      teachers/
        page.tsx          ← stub
      questions/
        page.tsx          ← stub
      config/
        page.tsx          ← stub
    api/
      auth/
        [...nextauth]/
          route.ts        ← stub (NextAuth handler added in Story 1.3)
      payments/
        payos/
          webhook/
            route.ts      ← stub
    layout.tsx            ← Root layout with font injection
    page.tsx              ← Root redirect (→ /login or /(parent)/dashboard)
    globals.css           ← Tailwind v4 import + design tokens
  domain/
    entities/             ← Empty dir (populated Story 1.2+)
    use-cases/            ← Empty dir
    constants.ts          ← Stub: export const WINDOW_SIZE = 10; (others TBD in Story 3.1)
  infrastructure/
    repositories/         ← Empty dir
    email/
      resend.ts           ← Stub
    storage/
      supabase-storage.ts ← Stub
    payment/
      payos.ts            ← Stub
  components/
    ui/                   ← shadcn init target
    student/              ← Empty dir
    parent/               ← Empty dir
    teacher/              ← Empty dir
  lib/
    auth.ts               ← Stub
    env.ts                ← Zod validation (fully implemented in this story)
    utils.ts              ← cn() utility
    child-profile-cookie.ts ← Stub
  locales/
    vi/
      common.ts           ← Empty exports
prisma/
  schema.prisma           ← Stub datasource + generator
  seed.ts                 ← Stub
  fixtures/
    .gitkeep
```

### Tailwind CSS v4 — Key Differences from v3

Tailwind CSS v4 changes configuration significantly. Do NOT use v3 patterns here:

| v3 pattern | v4 equivalent |
|---|---|
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` (single line in CSS) |
| `tailwind.config.js` with `theme.extend` | `@theme` block inside CSS |
| `tailwindcss` PostCSS plugin | `@tailwindcss/postcss` plugin |
| `theme.colors.primary` in config | `--color-primary: #F97316;` under `@theme` |

**postcss.config.mjs** (v4):
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**globals.css structure**:
```css
@import "tailwindcss";

/* shadcn will inject its @layer base block here on init */

@theme {
  /* Brand colors */
  --color-primary: #F97316;
  --color-primary-foreground: #FFFFFF;
  --color-student-bg: #FFF7ED;
  --color-feedback-correct: #16A34A;
  --color-feedback-correct-foreground: #FFFFFF;
  --color-feedback-incorrect: #F87171;
  --color-feedback-incorrect-foreground: #FFFFFF;
  --color-skill-strong-bg: #DCFCE7;
  --color-skill-strong-fg: #15803D;
  --color-skill-weak-bg: #FEF9C3;
  --color-skill-weak-fg: #854D0E;

  /* Typography tokens */
  --font-display: 'Baloo 2', sans-serif;
  --font-sans: 'Be Vietnam Pro', sans-serif;

  /* Border radius tokens */
  --radius-brand-sm: 8px;
  --radius-brand-md: 12px;
  --radius-brand-lg: 20px;
  --radius-brand-xl: 28px;
}

/* Dark mode overrides */
@layer base {
  .dark {
    --color-primary: #FB923C;
    --color-primary-foreground: #1C1007;
    --color-student-bg: #1C1007;
    --color-feedback-correct: #4ADE80;
    --color-feedback-correct-foreground: #052E16;
    --color-feedback-incorrect: #FCA5A5;
    --color-feedback-incorrect-foreground: #450A0A;
    --color-skill-strong-bg: #14532D;
    --color-skill-strong-fg: #86EFAC;
    --color-skill-weak-bg: #422006;
    --color-skill-weak-fg: #FDE68A;
  }
}
```

> **Important:** In Tailwind v4, `--color-*` variables declared under `@theme` automatically generate `bg-*`, `text-*`, `border-*` utility classes. For example, `--color-feedback-correct: #16A34A` generates `bg-feedback-correct`, `text-feedback-correct`, etc. No separate `safelist` needed.

> **Important:** `--radius-brand-*` declared under `@theme` generates `rounded-brand-sm`, `rounded-brand-md`, etc.

### Typography Tokens — Exact Spec

The five typography tokens should be available as Tailwind utility classes. In Tailwind v4, configure via `@utility` or as explicit class definitions in `@layer utilities`:

```css
@layer utilities {
  .text-display {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 36px;
    line-height: 1.15;
  }
  .text-question {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 22px;
    line-height: 1.5;
  }
  .text-label-student {
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 18px;
    line-height: 1.4;
  }
  .text-heading {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 20px;
    line-height: 1.3;
  }
  .text-body {
    font-family: var(--font-sans);
    font-weight: 400;
    font-size: 16px;
    line-height: 1.65;
  }
}
```

### Google Fonts Setup (Next.js 15 `next/font`)

In `src/app/layout.tsx`:
```tsx
import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google'

const baloo2 = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${baloo2.variable} ${beVietnamPro.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

> **Important:** The `variable` names must match the CSS custom properties used in `@theme` (`--font-display` and `--font-sans`).

### env.ts — Complete Zod Schema

```ts
import { z } from 'zod'

const envSchema = z.object({
  // Database — two connections, not interchangeable
  DATABASE_URL: z.string().url(),          // migrations-only (prisma migrate)
  DATABASE_URL_POOLED: z.string().url(),   // all runtime DB access (PgBouncer)

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
  PAYOS_CHECKSUM_KEY: z.string().min(1),  // used for HMAC-SHA256 webhook verification

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

> **Critical:** `DATABASE_URL` must NEVER be imported in any `src/` file other than `src/lib/env.ts`. The Prisma client singleton (created in Story 1.2 at `src/lib/db.ts`) must use `env.DATABASE_URL_POOLED` only.

### shadcn/ui Initialization Notes

- Run `npx shadcn@latest init` and select: TypeScript ✓, Tailwind CSS ✓, src directory ✓, App Router ✓
- shadcn will create/modify `globals.css` with its own `:root` / `.dark` CSS variable block — this is expected; the brand tokens added in Task 4 override the shadcn defaults
- shadcn components go into `src/components/ui/` — do NOT move them
- After init, verify `components.json` exists and correctly references `src/components/ui`

### Vercel Region — Do This Now

Create `vercel.json` at the project root:
```json
{
  "regions": ["sin1"]
}
```
This locks the deployment region to Singapore (ap-southeast-1), co-located with the Supabase Singapore instance. **This decision is irreversible once the Vercel project is created.** Setting it in `vercel.json` ensures it is always applied.

### Prisma Stub Schema (Task 7)

Story 1.1 creates the stub only. Story 1.2 adds all 13 entities. For now:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> Note: At runtime the `src/lib/db.ts` singleton (Story 1.2) will use `DATABASE_URL_POOLED`. The schema file itself references `DATABASE_URL` for CLI migrations only. This is correct and intentional per AD-3.

### Stub File Content Conventions

All stub files in this story should:
- Be valid TypeScript with no errors under strict mode
- Export the expected named exports (even if unimplemented)
- Use `// TODO: Implemented in Story X.Y` comments where appropriate
- NOT throw at import time (only at call time if truly unimplemented)

### `src/lib/utils.ts` (needed by shadcn)

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install deps: `pnpm add clsx tailwind-merge`

### `src/locales/vi/common.ts`

```ts
// Vietnamese locale strings — common across all surfaces
// Populated in subsequent stories
export const common = {} as Record<string, string>
```

### What This Story Does NOT Include

The following are intentionally deferred to later stories:
- Prisma schema entities (Story 1.2)
- `src/lib/db.ts` Prisma client singleton (Story 1.2)
- NextAuth configuration implementation (Story 1.3)
- `child-profile-cookie.ts` implementation (Story 1.3)
- Any actual page content beyond stub placeholders
- Any server actions
- Any infrastructure adapter implementations

### Project Structure Notes

- This is the first story in Epic 1 on a greenfield project — there are no existing files to preserve.
- The repo currently contains only: `.agents/`, `.claude/`, `.github/`, `_bmad/`, `_bmad-output/`, `docs/`.
- All new code lives under the project root (same directory as `_bmad-output/`).
- `vercel.json`, `package.json`, `tsconfig.json`, `postcss.config.mjs`, `next.config.ts`, `prisma/`, `src/` — all new.

### References

- Story requirements: [epics.md](../_bmad-output/planning-artifacts/epics.md#story-11-initialize-nextjs-monorepo--design-system-foundation)
- Design tokens (exact hex values): [DESIGN.md](../_bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md)
- Architecture directory structure: [ARCHITECTURE-SPINE.md#structural-seed](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- AD-3 (two Prisma connections): [ARCHITECTURE-SPINE.md#ad-3](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- AD-7 (Vercel Singapore region): [ARCHITECTURE-SPINE.md#ad-7](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- Project context (tech stack, conventions): [project-context.md](../_bmad-output/project-context.md)
- Typography spec (5 tokens): [DESIGN.md#typography](../_bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md)
- UX-DR1 (color tokens), UX-DR2 (fonts), UX-DR3 (border radius): [epics.md#ux-design-requirements](../_bmad-output/planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Prisma 7.x dropped `url = env()` in schema.prisma — downgraded to Prisma 5.22 which matches story spec syntax
- `pnpm create next-app` blocked by existing directories — scaffolded project manually (same outcome)
- shadcn `pnpm dlx init -d` ran but dep install conflicted with concurrent pnpm; installed clsx/tailwind-merge/cva/lucide-react separately
- ESLint `no-unused-vars` flagged `_`-prefixed stub params — added `argsIgnorePattern`/`varsIgnorePattern: ^_` rule override
- `prisma/seed.ts` was inside TypeScript compilation scope; removed `@prisma/client` import from stub (no models generated yet)
- Upgraded Next.js 15.3.4 → 15.3.9 to resolve CVE-2025-66478 security vulnerability

### Completion Notes List

- Bootstrapped Next.js 15.3.9 (Turbopack) manually due to existing directory conflict with `create-next-app`; all config files match expected output
- Prisma 5.22 installed (not v7) — v7 dropped `url = env()` schema syntax that all subsequent stories depend on
- shadcn/ui initialized with `base-nova` style, Tailwind v4 detected and confirmed
- All 12 brand CSS custom properties defined in `@theme` (light) and `.dark` override block; 5 typography `@layer utilities` classes created; 4 border-radius tokens registered
- Baloo 2 (weight 700) and Be Vietnam Pro (weights 400/600/700) loaded via `next/font/google` with `vietnamese` subset; variables injected into `<html>` className
- `src/lib/env.ts` uses Zod 4.4 — all 12 required vars validated at startup with `parse(process.env)`
- `pnpm build`: 16 static/dynamic pages generated, zero TypeScript errors, linting passed
- `pnpm dev`: ready in 4.6s, no errors

### File List

- .gitignore
- .env.example
- package.json
- tsconfig.json
- next.config.ts
- postcss.config.mjs
- eslint.config.mjs
- vercel.json
- components.json
- src/app/layout.tsx
- src/app/page.tsx
- src/app/globals.css
- src/app/(student)/session/page.tsx
- src/app/(student)/summary/page.tsx
- src/app/(parent)/dashboard/page.tsx
- src/app/(parent)/profiles/page.tsx
- src/app/(parent)/subscription/page.tsx
- src/app/(teacher)/assignments/page.tsx
- src/app/(teacher)/classes/page.tsx
- src/app/(teacher)/reports/page.tsx
- src/app/admin/teachers/page.tsx
- src/app/admin/questions/page.tsx
- src/app/admin/config/page.tsx
- src/app/api/auth/[...nextauth]/route.ts
- src/app/api/payments/payos/webhook/route.ts
- src/domain/constants.ts
- src/domain/entities/.gitkeep
- src/infrastructure/repositories/.gitkeep
- src/infrastructure/email/resend.ts
- src/infrastructure/storage/supabase-storage.ts
- src/infrastructure/payment/payos.ts
- src/components/student/.gitkeep
- src/components/parent/.gitkeep
- src/components/teacher/.gitkeep
- src/locales/vi/common.ts
- src/lib/auth.ts
- src/lib/env.ts
- src/lib/utils.ts
- src/lib/child-profile-cookie.ts
- prisma/schema.prisma
- prisma/seed.ts
- prisma/fixtures/.gitkeep

## Change Log

- 2026-07-08: Story 1.1 implemented — Next.js 15.3.9 monorepo scaffolded, full directory structure created, Tailwind v4 + shadcn/ui installed, brand design tokens configured, env.ts with Zod validation created, stub lib/infra files created, Prisma 5 stub schema validated, build passes zero errors
