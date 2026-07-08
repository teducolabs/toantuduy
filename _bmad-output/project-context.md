---
project_name: 'ToanTuDuy'
user_name: 'Toan'
date: '2026-07-08'
sections_completed: ['technology_stack', 'architecture_layer_rules', 'auth_authorization', 'database_infrastructure', 'payment_security', 'domain_business_logic', 'code_style_naming', 'ux_design_tokens']
status: complete
existing_patterns_found: 14
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework:** Next.js (App Router, v14+) — monorepo, no separate backend service
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **Auth:** NextAuth v5
- **UI:** shadcn/ui + Tailwind CSS v4
- **Payments:** PayOS (webhook-based, HMAC-SHA256 verification required)
- **Storage:** Supabase Storage (public CDN bucket for question images)
- **Email:** Resend (via `src/infrastructure/email/resend.ts`)
- **Deployment:** Vercel region `sin1` (ap-southeast-1 Singapore)
- **IDs:** cuid2 via Prisma `@default(cuid())` — never UUID
- **Fonts:** Baloo 2 (display/student headlines), Be Vietnam Pro (all other text)
- **Locale:** Vietnamese (`vi`) — all UI strings from `src/locales/vi/`

---

## Architecture Layer Rules

Four layers — direction is STRICT (no bypassing):
`Presentation → Application (server actions) → Domain → Infrastructure`

- **Presentation** (`src/app/`, `src/components/`): imports only Domain types and server actions. MUST NOT import from `src/domain/` or `src/infrastructure/` directly.
- **Application** (`src/app/**/actions.ts` — server actions): the only entry point from Presentation into business logic.
- **Domain** (`src/domain/`): pure business logic. Zero imports from `@prisma/client`, Next.js, or any external SDK.
- **Infrastructure** (`src/infrastructure/`): DB, storage, email, payment adapters. Imports Domain types and external SDKs only.
- Every server action MUST begin with a session check — return `{ error: { code: 'UNAUTHORIZED' } }` if no session.
- Server actions NEVER throw — always return `{ data: T } | { error: { code: string; message: string } }`.

---

## Auth & Authorization Rules

- **Auth provider:** NextAuth v5. Roles: `PARENT`, `TEACHER`, `ADMIN` — always read from server-side session (`session.user.role`). Client-side session is display-only; NEVER trust client-supplied role claims.
- Google OAuth is enabled for **Parent accounts only**. Teacher and Admin accounts use email/password exclusively.
- **Child Profile selection:** `childProfileId` stored in a signed, `httpOnly` session cookie — NOT in the NextAuth JWT. The student surface reads `childProfileId` from the cookie server-side. These two claims (`parentAccountId` from JWT, `childProfileId` from cookie) NEVER coexist in the same JWT.
- **Teacher approval gate (dual check required):**
  1. `signIn` callback must reject if `teacher.status !== 'APPROVED'`.
  2. Every `/teacher/*` layout and server action must ALSO verify `status === 'APPROVED'` server-side — the JWT role alone is insufficient (status can change post token issuance).
- **Admin gate:** Every `/admin/*` layout and server action must verify `session.user.role === 'ADMIN'` server-side — return 403/redirect otherwise.

---

## Database & Infrastructure Rules

- **Two Prisma connection strings — usage is NOT interchangeable:**
  - `DATABASE_URL` (direct): used ONLY by `prisma migrate` and `prisma db seed`. Never at runtime.
  - `DATABASE_URL_POOLED` (Supabase PgBouncer): used for ALL runtime DB access.
- One schema file: `prisma/schema.prisma`. All relations must be explicit. No raw SQL in application code except via `prisma.$queryRaw` where unavoidable.
- **IDs:** Always `cuid2` via `@default(cuid())`. Never use UUID.
- **Dates:** All timestamps stored as `DateTime` (UTC) in Prisma; serialized as ISO 8601 UTC strings across the wire.
- **Images:** Question images live in Supabase Storage (public bucket). `Question.imageUrl` must always be a fully-qualified CDN URL or `null` — never a relative path or blob URL. No proxying through the Next.js server.
- **Email:** All outbound email through `src/infrastructure/email/resend.ts`. No surface code may import from the Resend SDK directly.
- **Env vars:** All secrets and config via environment variables. `src/lib/env.ts` exports validated env vars using `zod`. No hard-coded credentials anywhere in `src/`.

---

## Payment & Security Rules

- **PayOS webhook handler** lives at `/api/payments/payos/webhook`.
- HMAC-SHA256 signature MUST be verified on EVERY inbound webhook request before any DB mutation. Never process an unverified payload.
- `Subscription.status` transitions (`PENDING_PAYMENT → ACTIVE`, `ACTIVE → EXPIRED`) are ONLY valid from:
  1. The PayOS webhook handler, OR
  2. A scheduled expiry job.
  — Never from a client-invoked server action.
- No client-side call or server action may directly activate a subscription without payment confirmation.

---

## Domain Layer & Business Logic Rules

- **Adaptive difficulty** lives in `src/domain/use-cases/adaptive-difficulty.ts`. Signature: `selectNextQuestion(skillAccuracyHistory: SkillAccuracyWindow[], availableQuestions: Question[]): Question`. Zero external imports.
- Algorithm: per-Skill sliding window over last `N` answered questions (default `N=10`). Increase Difficulty Level when accuracy > `ACCURACY_UP_THRESHOLD` (0.80); decrease when < `ACCURACY_DOWN_THRESHOLD` (0.50). `N` and both thresholds are exported constants in `src/domain/constants.ts`.
- **Questions** are never hard-coded in application logic. Initial corpus loaded via `prisma/seed.ts` from `prisma/fixtures/`. Ongoing authoring via `/admin/questions` CRUD UI.
- **No real-time connections** in v1: no `socket.io`, SSE, or long-polling for teacher report data. Teacher Portal fetches data via Next.js Server Components on navigation.
- **Free Tier allotment:** default 5 Questions per Child Profile per calendar day — admin-configurable. No upsell content appears within the student surface.
- **Session question count:** default 10, admin-configurable range 5–30. One Session per day is the intended cadence.

---

## Code Style & Naming Conventions

- **File & directory naming:** kebab-case for everything (`adaptive-difficulty.ts`, `child-profile-repository.ts`).
- **Types & interfaces:** PascalCase (`ChildProfile`, `SessionAnswer`).
- **Functions & variables:** camelCase.
- **Vietnamese UI strings:** NEVER inline Vietnamese text in component code. All Vietnamese strings live in locale files under `src/locales/vi/`.
- **Server action return shape** (always, no exceptions):
  ```ts
  { data: T } | { error: { code: string; message: string } }
  ```
- **Question images:** `imageUrl` must be a fully-qualified CDN URL or `null`. Never a relative path.
- **Grade Band:** does NOT change automatically. Difficulty Level adjusts within the current Grade Band only.

---

## UX & Design Token Rules

- **Brand primary:** `#F97316` (orange) / dark `#FB923C`.
- **Student surface background:** `#FFF7ED` (warm cream) — overrides shadcn default only in student routes.
- **Feedback tokens** (do NOT substitute shadcn defaults here):
  - Correct: `#16A34A` (vivid green) — `feedback-correct`
  - Incorrect: `#F87171` (warm rose, NOT alarm red) — `feedback-incorrect`
- **Skill badge tokens** (parent dashboard only):
  - Strong: bg `#DCFCE7` / fg `#15803D`
  - Weak: bg `#FEF9C3` / fg `#854D0E`
- **Fonts:**
  - `Baloo 2 700` — display/student session summary headlines only.
  - `Be Vietnam Pro` — all other text (body, headings, labels, answer buttons).
- **Border radius:** Student surface uses `lg` (20px) / `xl` (28px). Adult surfaces use `sm` (8px) / `md` (12px).
- **Answer buttons:** min-height `64px`, touch target floor `44×44px`. Tap submits immediately — no confirm step.
- All remaining tokens (background, foreground, muted, border, card, etc.) inherit shadcn defaults.

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project.
- Follow ALL rules exactly as documented — these exist to prevent real mistakes.
- When in doubt, prefer the more restrictive option.
- If a new invariant is added to `ARCHITECTURE-SPINE.md`, update this file.

**For Humans:**
- Keep this file lean — remove rules that become obvious over time.
- Update when the tech stack changes (NextAuth version, Prisma, etc.).
- Review after each major epic.

_Last Updated: 2026-07-08_
