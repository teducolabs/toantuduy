---
baseline_commit: ca18670
---

# Story 2.2: Child Profile Switch & Student Surface Entry

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to select one of my Child Profiles and enter the student surface for that child,
so that my child can start practicing without needing their own login credentials.

## Acceptance Criteria

1. **Given** I tap a Child Profile name in the profile switcher Sheet, **When** the selection is processed, **Then** `setChildProfileCookie` is called server-side with the selected `ChildProfile.id`, setting a signed httpOnly `child-profile-id` cookie (SameSite=Strict). **And** the Sheet closes and the parent shell header reflects the newly active profile's name immediately.
2. **Given** the `child-profile-id` cookie is valid and set, **When** the student surface (`/(student)/`) layout runs server-side, **Then** `getChildProfileId()` reads and verifies the cookie; the student home screen renders with the active Child Profile's display name. (The full home screen UI — greeting, practice CTA card, etc. — is Story 2.3's scope; this story's page only needs to prove the cookie → display-name path works end-to-end, e.g. a minimal "Xin chào [Tên]" render.)
3. **Given** a request reaches any `/(student)/` route without a valid `child-profile-id` cookie, **When** the layout server-side check runs, **Then** the request is redirected to `/(parent)/dashboard`; the student surface is never accessible without an active profile.
4. **Given** I switch from Profile A to Profile B via the switcher, **When** the cookie is updated, **Then** subsequent navigations to the student surface reflect Profile B's data; Profile A's cookie value is no longer accepted (re-signed cookie for the new `profileId`, verified via HMAC — an old signed value for Profile A fails verification against Profile B's id and is never substituted for it).
5. **And** `parentAccountId` (from the NextAuth JWT) and `childProfileId` (from the cookie) never coexist in the same JWT — they are separate claims read from separate sources (AD-5). This story must not add `childProfileId` to `src/lib/auth.ts`'s JWT/session callbacks.
6. **And** the student surface root layout (`/(student)/layout.tsx`) sets `data-mode="student"` on the root element, activating the warm cream canvas (`student-bg`) via Tailwind.

## Tasks / Subtasks

- [x] **Task 1: Make `setChildProfileCookie` callable from a Server Action** (AC: #1, #4)
  - [x] 1.1 — Read `src/lib/child-profile-cookie.ts` first. Its current signature is `setChildProfileCookie(profileId: string, response: NextResponse): void`, written for a route-handler/middleware context (`response.cookies.set(...)`). **This signature cannot be called from a `'use server'` action** — there is no `NextResponse` object available inside a server action. Do not thread a `NextResponse` through the action; instead widen the parameter type to accept anything with a `.set(name, value, options)` method (both `NextResponse.cookies` and the mutable cookie store returned by `await cookies()` from `next/headers` inside a Server Action/Route Handler satisfy this shape). A minimal, safe change: type the parameter as `{ set: (name: string, value: string, options?: Parameters<typeof NextResponse.prototype.cookies.set>[2]) => void }`, or more simply reuse Next's own `ResponseCookies` type if already imported elsewhere in the codebase — grep for it first. Do not fork the signing/verification logic into a second copy; this is the single existing utility (built in Story 1.3) and must stay the only place `child-profile-id` is signed or read (AD-5).
  - [x] 1.2 — Do not change `getChildProfileId()` — it already takes the public `next/headers` `headers()` return type and is called correctly from Server Components/layouts.

- [x] **Task 2: `switchActiveChildProfileAction` server action** (AC: #1, #4, #5)
  - [x] 2.1 — Add to the existing `src/app/(parent)/profiles/actions.ts` (do not create a new actions file — this file already owns all Child Profile server actions per Story 2.1). Follow the exact pattern already in this file: `requireParentAccountId()` first (session check, PARENT role, resolve `parentAccountId`), then Zod-validate `{ id: string }`.
  - [x] 2.2 — **Ownership check is mandatory**: before setting the cookie, verify the target `ChildProfile` belongs to the resolved `parentAccountId` (reuse `listChildProfiles(parentAccountId)` and check membership, or add a scoped lookup to `child-profile-repository.ts` — do not add a new repository file for this, extend the existing `child-profile-repository.ts`). A parent must never be able to set the cookie to a Child Profile they don't own by guessing an id. Return `{ error: { code: 'NOT_FOUND', message: '...' } }` if it doesn't resolve.
  - [x] 2.3 — Inside the action, get the mutable cookie store via `const cookieStore = await cookies()` (from `next/headers`) and pass it into the widened `setChildProfileCookie(profileId, cookieStore)` from Task 1.
  - [x] 2.4 — Return `{ data: { childProfileId: string } } | { error: { code: string; message: string } }` — never throw (project-wide server action convention).
  - [x] 2.5 — Do not call `revalidatePath` for the student surface here — the student layout is a Server Component that reads the cookie fresh on every navigation; no cache to invalidate. Do call `revalidatePath('/profiles', 'layout')` is NOT needed either (no DB row changed) — skip revalidation entirely for this action.

- [x] **Task 3: Wire the switcher UI to the new action** (AC: #1)
  - [x] 3.1 — Read `src/components/parent/child-profile-switcher.tsx` fully first (it's from Story 2.1). Currently: `activeProfile = childProfiles[0]` (a placeholder — no real "active" concept exists yet) and the Sheet's `<li>` rows are static, non-interactive (`Story 2.1's explicit scope boundary — see its Task 5.3 — deliberately left these unwired`).
  - [x] 3.2 — Convert each profile `<li>` into a tappable row (e.g. wrap in a `button` or make the `<li>` clickable) that calls `switchActiveChildProfileAction({ id: childProfile.id })` on click, then closes the Sheet on success.
  - [x] 3.3 — "Newly active profile's name immediately" (AC #1): since there's no client-side "active profile" state today (`activeProfile = childProfiles[0]` is a display-only stand-in, not derived from the cookie), you need the switcher to actually track which profile is active. Two viable approaches — pick the simpler one that doesn't break Story 2.1's existing render: (a) after a successful switch, use `router.refresh()` (Next.js `useRouter` from `next/navigation`) to re-run the parent layout Server Component so it can re-derive the active profile server-side, or (b) lift active-profile state into the client component via local `useState` initialized from a server-provided "active profile id" prop. Given the parent layout (`src/app/(parent)/layout.tsx`) is already an `async` Server Component that fetches `childProfiles` fresh per request, **prefer (a)**: the layout should read `getChildProfileId()` server-side (it already imports nothing from `child-profile-cookie.ts` today — this is new for this story) and pass the resolved active profile down as a prop, then `router.refresh()` after the switch re-triggers that server read. This keeps `child-profile-switcher.tsx` mostly presentational.
  - [x] 3.4 — The Sheet must close after a successful switch (shadcn `Sheet` — control via `open`/`onOpenChange` state, closing it programmatically after the action resolves without error).
  - [x] 3.5 — On action error (e.g. `NOT_FOUND`), keep the Sheet open and surface a `sonner` toast using existing patterns from `delete-child-profile-dialog.tsx` (Story 2.1) — do not add a new toast pattern.

- [x] **Task 4: Student surface layout — cookie gate + `data-mode="student"`** (AC: #2, #3, #6)
  - [x] 4.1 — Create `src/app/(student)/layout.tsx` (does not exist yet — `src/app/(student)/` currently only has `session/page.tsx` and `summary/page.tsx`, both stub Server Components with no layout wrapping them). This is a new file, not a modification.
  - [x] 4.2 — `async` Server Component. Call `await headers()` (from `next/headers`) then `getChildProfileId(headers)` (already built, Story 1.3 — do not reimplement). If it returns `null`, `redirect('/dashboard')` (the parent dashboard route — confirm the exact path matches `src/app/(parent)/dashboard/page.tsx`'s route; per Story 1.5 the parent shell lives at `/(parent)/dashboard` with route group `(parent)` not contributing to the URL, so the redirect target is `/dashboard`).
  - [x] 4.3 — If the cookie resolves to a `childProfileId`, look up the `ChildProfile` (reuse/extend `child-profile-repository.ts` — e.g. a `getChildProfileById(id)` read, since none of the existing exports take a bare `id` without `parentAccountId` scoping; the student surface has no parent session to scope by, only the cookie's profile id — that's the intended trust boundary per AD-5, the signed cookie *is* the authorization). If the profile doesn't exist (e.g. hard-deleted, or soft-deleted past retention) treat it the same as a missing cookie — `redirect('/dashboard')`.
  - [x] 4.4 — Root element of this layout renders `data-mode="student"` and the `bg-student-bg` Tailwind utility class (generated from the `--color-student-bg` CSS variable already defined in `src/app/globals.css` from Story 1.1 — do not add new CSS, the token exists, this story just needs to apply it). No persistent nav chrome in this layout (UX-DR10) — just the data-mode wrapper and `{children}`.
  - [x] 4.5 — Do **not** add `childProfileId` to any JWT/session callback in `src/lib/auth.ts` (AC #5) — the student layout's only source of truth is the cookie via `getChildProfileId()`.

- [x] **Task 5: Minimal student home page for AC #2** (AC: #2)
  - [x] 5.1 — ~~Create `src/app/(student)/page.tsx`~~ — superseded during implementation: a pre-existing plain `src/app/page.tsx` (Story 1.5) always wins route resolution for `/` over a route-group page, so `(student)/page.tsx` was dead code and was removed; the minimal greeting for AC #2 lives in `src/app/page.tsx` instead (see Completion Notes and Review Findings).
  - [x] 5.2 — Fetch the active profile the same way the layout does in Task 4.3 — done via a shared `resolveActiveChildProfile()` helper (`src/lib/active-child-profile.ts`) used by both `src/app/page.tsx` and `src/app/(student)/layout.tsx`, so the cookie-read-then-DB-lookup is not duplicated (added during code review, see Review Findings).
  - [x] 5.3 — All Vietnamese text from `src/locales/vi/` — add a new `src/locales/vi/student.ts` if none exists yet for student-surface strings (confirm first: `src/locales/vi/` currently only has `common.ts`, `auth.ts`, `profiles.ts`). Do not inline Vietnamese text (project-wide rule).

- [x] **Task 6: Build & manual verification**
  - [x] 6.1 — Run `pnpm build` — zero TypeScript strict-mode errors. No test framework exists in this repo yet (unchanged since Story 1.1/2.1 — the Epic 1 retro action item targets Epic 3, not this story).
  - [x] 6.2 — Manual smoke test via `pnpm dev` (same DB-connectivity caveat as Story 2.1 may apply in this sandbox — if so, document precisely what could and could not be verified, do not claim full verification):
    - (a) unauthenticated request to `/(student)/` (i.e. `/`) redirects to `/dashboard`... — actually confirm: an unauthenticated PARENT request to any `/(student)/` route with no cookie at all redirects to `/dashboard`, which itself redirects unauthenticated sessions to `/login` (chained redirect via the parent layout's own session check — do not short-circuit the student layout straight to `/login`, per AC #3 the redirect target is specifically `/(parent)/dashboard`);
    - (b) as an authenticated parent with no `child-profile-id` cookie set, visiting `/(student)/` (or `/session`, `/summary`) redirects to `/dashboard`;
    - (c) tapping a profile in the switcher Sheet sets the cookie, closes the Sheet, and the header shows the new active profile's name without a manual page reload;
    - (d) after switching, navigating to `/(student)/` (`/`) renders that profile's display name;
    - (e) switch to a second profile, confirm the student surface now reflects the second profile, not the first;
    - (f) inspect the cookie in devtools — confirm `httpOnly`, `SameSite=Strict`, name `child-profile-id`;
    - (g) attempt to tamper with the cookie value client-side (edit one character) and reload `/(student)/` — confirm it's rejected (`getChildProfileId` returns `null` on bad signature) and redirects to `/dashboard`, not a server error.

## Dev Notes

### Architecture Compliance

- **Layer rules (AD-2):** the new `switchActiveChildProfileAction` belongs in `src/app/(parent)/profiles/actions.ts` (Application layer) — the student layout and page (Presentation) must call `getChildProfileId()` (an `src/lib/` utility, not Infrastructure) and repository functions only through... actually `getChildProfileId` is a `src/lib/` helper, not a server action — that's fine, it's a pure read of request headers, not a DB call, and Story 1.3 already established this exact call pattern (used from Server Components directly). Any DB lookup by `childProfileId` (Task 4.3) must go through `child-profile-repository.ts` (Infrastructure) — do not call `db.childProfile.findUnique` directly from `layout.tsx` or `page.tsx`.
- **Server action return shape / session check:** `switchActiveChildProfileAction` follows the exact `requireParentAccountId()` → Zod validate → business logic → `{ data } | { error } ` pattern already established in `src/app/(parent)/profiles/actions.ts` by Story 2.1 — do not introduce a new error-handling style.
- **AD-5 is the crux of this story:** `parentAccountId` (JWT) and `childProfileId` (cookie) are two separate, never-overlapping claims. The student layout has **no NextAuth session available or needed** — its only authorization signal is the signed cookie. Do not call `auth()` in `src/app/(student)/layout.tsx`.
- **cuid2 IDs** — `ChildProfile.id` already uses `@default(cuid())`; no schema changes needed for this story.

### Known signature mismatch to resolve (Task 1)

`src/lib/child-profile-cookie.ts`'s `setChildProfileCookie(profileId: string, response: NextResponse): void` was written assuming a route-handler caller. This story's caller is a **Server Action**, which has no `NextResponse`. Server Actions and Route Handlers in Next.js 15 both get a mutable cookie store via `await cookies()` from `next/headers` (this store exposes the same `.set(name, value, options)` shape as `NextResponse.cookies`). Widen the function's second parameter type to accept either — do not duplicate the HMAC signing logic in a second function, and do not try to construct a `NextResponse` inside a server action (server actions don't return/use `NextResponse`).

### What this story does NOT touch (scope boundary vs. Story 2.1 and Story 2.3)

- Story 2.1 already built: `child-profile-repository.ts` (CRUD), `actions.ts` (CRUD actions), the Profiles page, and the switcher's Sheet UI listing profiles + "Thêm hồ sơ". This story **extends** those files — it does not recreate them. In particular, Story 2.1's Task 5.3 explicitly left the switcher's profile rows non-interactive and explicitly said not to import `child-profile-cookie.ts` from that story's code — this story is precisely the one that lifts that boundary.
- Story 2.3 ("Student Home Screen Shell") owns the *actual* home screen experience — greeting typography, `student-home-card`, practice CTA, assignment-card stub, mid-session-resume stub. This story's `page.tsx` (Task 5) must stay minimal (just prove the display name renders) so Story 2.3 doesn't have to undo over-built work.
- No changes to `src/domain/`, `src/infrastructure/repositories/question-repository.ts`, `session-repository.ts`, or anything Epic 3 (Session/SessionAnswer don't exist as populated tables yet).
- Do not touch `src/lib/auth.ts`'s JWT/session callbacks (AC #5).

### Previous Story Intelligence (Story 2.1)

- Session shape: `session.user: { id, role, email }` — no `parentAccountId`; every action resolves it via `db.parentAccount.findUnique({ where: { userId: session.user.id } })`. `switchActiveChildProfileAction` must follow this exact same resolution (reuse `requireParentAccountId()` — it's already exported... check: it's currently a private (non-exported) helper function in `actions.ts` — since it's in the same file, you can call it directly without exporting it).
- `revalidatePath('/profiles', 'layout')` is the pattern used after every *mutating* action in Story 2.1 (added during that story's code review to cover the whole `(parent)` layout, not just `/profiles`). This story's action does not mutate any DB row (it only sets a cookie), so do not add a `revalidatePath` call for it — there's nothing server-rendered to invalidate under `(parent)/*` from a cookie change, and the student surface reads the cookie fresh on every request regardless of Next.js caching.
- Story 2.1's review found and fixed a layer-boundary violation (page/layout importing `db` directly instead of via server actions) and a TOCTOU race in ownership-scoped updates (fixed via `db.$transaction`). Apply the same ownership-scoping discipline to Task 2.2's lookup here — do not add a new code path that skips ownership scoping.
- shadcn/ui primitives (`sheet`, `dialog`, `alert-dialog`, `select`, `input`, `label`, `button`, `card`, `sonner`) are already installed; do not reinstall or duplicate.
- No test framework exists yet — `pnpm build` clean + manual smoke test remains the verification bar (open action item from Epic 1 retro targets Epic 3, not this story).
- File/directory naming: kebab-case throughout.

### Git Intelligence Summary

- HEAD is `ca18670` ("feat: add child profile management components and localization" — Story 2.1's implementation, already merged/committed). `src/components/parent/child-profile-switcher.tsx`, `src/app/(parent)/layout.tsx`, and `src/app/(parent)/profiles/actions.ts` are all in the state shown above (already read in full for this story) — this story modifies all three plus creates new `(student)/` files.
- No commits yet touch `src/app/(student)/` beyond the two pre-existing stub pages (`session/page.tsx`, `summary/page.tsx`), both untouched placeholders from initial scaffolding (Story 1.1) — `src/app/(student)/layout.tsx` and `src/app/(student)/page.tsx` are wholly new in this story.

### Project Structure Notes

- **Files to create:** `src/app/(student)/layout.tsx`, `src/app/(student)/page.tsx`, optionally `src/locales/vi/student.ts` (if student-surface strings don't already exist — confirmed they don't).
- **Files to modify:** `src/lib/child-profile-cookie.ts` (widen `setChildProfileCookie`'s parameter type only — do not touch `getChildProfileId`), `src/app/(parent)/profiles/actions.ts` (add `switchActiveChildProfileAction`; optionally add an ownership-scoped `getChildProfileById`-style export to `child-profile-repository.ts` if needed for Task 2.2/4.3 — confirm whether an unscoped-by-parent lookup by bare `id` already exists before adding one, it currently does not), `src/infrastructure/repositories/child-profile-repository.ts` (add a lookup used by both Task 2.2's ownership check and Task 4.3's student-layout read — a single new export can serve both), `src/components/parent/child-profile-switcher.tsx` (wire tap-to-switch), `src/app/(parent)/layout.tsx` (read `getChildProfileId()` server-side to pass the true active profile to the switcher, per Task 3.3).
- No Prisma migration needed — `ChildProfile` schema is already complete.
- The `student-bg` color token and `bg-student-bg` Tailwind utility already exist from Story 1.1 (`src/app/globals.css` `--color-student-bg`) — this story applies the existing token via `data-mode="student"` + the utility class; it does not define new CSS.

### Testing Standards

- No test framework in this repo yet (same as Story 2.1). Verification is `pnpm build` clean + the manual smoke sequence in Task 6.2, with particular attention to (g) — the tampered-cookie rejection path — since that's the actual security boundary this story establishes (AD-5's "signed cookie is the authorization" model).

### References

- Story requirements: [epics.md](../planning-artifacts/epics.md) — "Story 2.2: Child Profile Switch & Student Surface Entry"
- Architecture spine (AD-5 cookie handoff, AD-2 layer rules, AD-4 auth, Consistency Conventions): `architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md`
- UX spine (`child-profile-switcher` spec row, UX-DR10 student-mode surface scoping / `data-mode="student"`): `ux-designs/ux-toantuduy-2026-07-08/DESIGN.md`
- Project context (auth rules, layer rules, code style): [project-context.md](../project-context.md)
- Previous story (Child Profile CRUD + switcher Sheet this story extends): [2-1-create-manage-child-profiles.md](./2-1-create-manage-child-profiles.md)
- Downstream consumer: Story 2.3 (Student Home Screen Shell) will replace this story's minimal `page.tsx` with the full greeting/CTA UI; Epic 3 will build the actual practice session inside `session/page.tsx`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm build` (via `prisma migrate deploy && next build`) fails in this sandbox with `Environment variable not found: DATABASE_URL` — the Prisma CLI only reads `.env`, and this repo only ships `.env.local` (Next.js convention). This is the same DB-connectivity caveat noted in Story 2.1, unrelated to this story's changes (no schema change here). Verified the build via `next build` directly instead — 0 TypeScript errors, all 20 routes compiled.
- Manual smoke test run via `next dev` (ports 3000/3004/3001 due to leftover background processes) and `curl`, since there is no browser available in this sandbox and no seeded PARENT credentials to drive a full authenticated login → switch → render flow. Verified via curl: unauthenticated `/` → 307 `/login`; unauthenticated `/session` (a `/(student)/*` route) → 307 `/dashboard` (per AC #3); a tampered-signature `child-profile-id` cookie on `/session` → 307 `/dashboard`, not a server error (confirms `getChildProfileId` rejects bad signatures per AC #4's HMAC verification, item (g) in Task 6.2). Could **not** verify the authenticated switch → cookie-set → header-update → home-render chain end-to-end (items (c)–(f) in Task 6.2) — no DB-seeded parent/child-profile fixtures or credentials were available in this sandbox to log in as a real parent.

### Completion Notes List

- **Routing conflict discovered and resolved (not in original task list):** `src/app/page.tsx` already existed (from Story 1.5) as a role-based landing redirect (`PARENT → /dashboard`, `TEACHER → /classes`, `ADMIN → /admin`) and, being a plain (non-grouped) `page.tsx`, it silently wins route resolution for `/` over `src/app/(student)/page.tsx` — Next.js allows only one page per resolved path and does not error in this specific ungrouped-vs-grouped case, it just shadows the other file. Confirmed via `curl`: before the fix, `GET /` returned the old direct-to-`/login` behavior even with the new `(student)` tree in place, i.e. the student home page/gate was dead code.
  - **Fix:** removed the now-unreachable `src/app/(student)/page.tsx` and folded its logic into `src/app/page.tsx`: for an authenticated `PARENT` session with a valid `child-profile-id` cookie, it now renders the same minimal `data-mode="student"` / `bg-student-bg` greeting inline; otherwise it falls back to the pre-existing role redirect unchanged. `src/app/(student)/layout.tsx` is unaffected and still gates the real, distinct `(student)` routes (`/session`, `/summary`) exactly as specified in Task 4 — this only affects the bare-root case, since route groups can never produce a URL distinct from their parent path.
  - One behavioral nuance vs. the story's Task 6.2(a) description: unauthenticated requests to bare `/` still redirect directly to `/login` (unchanged from before this story) rather than chaining through `/dashboard` first — the described "chained redirect via `/dashboard`" is exactly what happens for the other, genuinely `(student)`-only routes (`/session`, `/summary`, verified above), where the security boundary (AC #3: never expose the surface without a valid cookie) is what's actually load-bearing; it still holds for `/` too, just via the pre-existing direct path.
- AC #5 verified by construction — `switchActiveChildProfileAction` never touches `src/lib/auth.ts`, and the student layout/page/root-page cookie checks never call `auth()` for the child-profile claim.
- `requireParentAccountId()` in `actions.ts` remained private/unexported per Story 2.1's pattern; called directly since `switchActiveChildProfileAction` lives in the same file.
- `findChildProfileById(id)` (new, in `child-profile-repository.ts`) is intentionally unscoped by `parentAccountId` — it serves two different call sites with two different authorization models: `switchActiveChildProfileAction` performs its own ownership check by comparing `childProfile.parentAccountId` against the resolved parent (AC path), while the student surface (root page + `(student)/layout.tsx`) has no parent session at all and relies solely on the signed cookie as its authorization boundary (AD-5).

### File List

- `src/lib/child-profile-cookie.ts` (modified — widened `setChildProfileCookie`'s second parameter to a structural `CookieSetter` type so it can be called from a Server Action; later re-based on `child-profile-signature.ts` during code review)
- `src/app/(parent)/profiles/actions.ts` (modified — added `switchActiveChildProfileAction`; `requireParentAccountId` exported during code review for reuse by `src/app/page.tsx`)
- `src/infrastructure/repositories/child-profile-repository.ts` (modified — added `findChildProfileById`)
- `src/components/parent/child-profile-switcher.tsx` (modified — tappable profile rows wired to `switchActiveChildProfileAction`, `activeProfileId` prop, Sheet open state, error toast)
- `src/app/(parent)/layout.tsx` (modified — reads `getChildProfileId()` server-side and passes `activeProfileId` to the switcher)
- `src/app/(student)/layout.tsx` (new — cookie gate + `data-mode="student"` / `bg-student-bg`; note: `src/app/(student)/page.tsx` was never shipped, see Task 5.1)
- `src/app/page.tsx` (modified — folded the greeting for AC #2 into the existing role-redirect root page, since a route-group page under `(student)/` can never win route resolution over this plain page; see Completion Notes and Review Findings)
- `src/locales/vi/student.ts` (new — student-surface Vietnamese strings)
- `src/locales/vi/profiles.ts` (modified — added `switchFailed` toast string)

**Added during code review (2026-07-18):**

- `src/lib/child-profile-signature.ts` (new — pure Web-Crypto HMAC sign/verify + cookie-value parsing, extracted so Edge Middleware can verify the cookie without importing `@/lib/env`'s full schema)
- `src/lib/active-child-profile.ts` (new — shared `resolveActiveChildProfile()` helper used by `src/app/page.tsx` and `src/app/(student)/layout.tsx`, replacing duplicated cookie-read + DB-lookup logic)
- `src/infrastructure/repositories/child-profile-repository.ts` (added `findChildProfileByIdForParent` — ownership-scoped lookup for the parent-surface root page)
- `src/middleware.ts` (new — clears the `child-profile-id` cookie on `/`, `/session`, `/summary`, `/dashboard` when its HMAC signature fails verification)
- `src/lib/auth-actions.ts` (new — `signOutAction`; clears the `child-profile-id` cookie and calls NextAuth's `signOut`. No sign-out flow existed anywhere in the app before this)
- `src/app/(parent)/layout.tsx` (further modified — added a sign-out button next to the profile switcher)
- `src/locales/vi/common.ts` (added `signOut` string)

## Change Log

- 2026-07-18 — Implemented Story 2.2: child-profile switch server action + UI wiring, `(student)` layout cookie gate, minimal student home render. Discovered and resolved a pre-existing route conflict at `/` between Story 1.5's role-redirect root page and this story's new student-surface root page (see Completion Notes). Status → review.

### Review Findings

- [x] [Review][Patch] `child-profile-id` cookie is never cleared on sign-out, enabling cross-parent data exposure on shared devices [src/lib/auth.ts] — Fixed: added `src/lib/auth-actions.ts` (`signOutAction`, wired into `(parent)/layout.tsx`) which clears the `child-profile-id` cookie before calling `signOut()`. Note: no sign-out flow existed anywhere in the app before this fix — building it was in scope beyond the original finding.
- [x] [Review][Patch] Student-home render logic duplicated between `src/app/page.tsx` and the `(student)` route group; story file list/tasks stale [src/app/page.tsx, src/app/(student)/layout.tsx] — Fixed: extracted `resolveActiveChildProfile()` (`src/lib/active-child-profile.ts`), used by both `src/app/page.tsx` and `src/app/(student)/layout.tsx`. Task 5.1, 5.2, and the File List above have been reconciled to reflect that `(student)/page.tsx` was never shipped.
- [x] [Review][Patch] `src/app/page.tsx` renders another parent's child-profile data with no ownership check [src/app/page.tsx:18-21] — Fixed: added `findChildProfileByIdForParent(id, parentAccountId)` to `child-profile-repository.ts`; `resolveActiveChildProfile()` uses it when a `parentAccountId` is supplied (root page now resolves it via the newly-exported `requireParentAccountId()` before rendering).
- [x] [Review][Patch] `handleSwitch` has no `catch`, only `try/finally` [src/components/parent/child-profile-switcher.tsx:27-40] — Fixed: added a `catch` that shows `profiles.switchFailed`.
- [x] [Review][Patch] Rapid double-tap on switcher rows can fire two overlapping switch calls [src/components/parent/child-profile-switcher.tsx:27-28] — Fixed: `handleSwitch` now returns early if `switchingId !== null`, checked synchronously before the state update.
- [x] [Review][Patch] Stale/invalid `child-profile-id` cookie is never cleared on failed lookup [src/app/page.tsx:17-22, src/app/(student)/layout.tsx:8-16] — Partially fixed with a scope reduction agreed during review: Server Components can't mutate cookies at all in Next.js (only Server Actions/Route Handlers can), so clearing from `page.tsx`/`layout.tsx` directly isn't possible. Added `src/middleware.ts` instead, which clears the cookie when its HMAC signature fails verification (tampered/malformed cookie). It does **not** cover the soft-deleted-profile case (a validly-signed cookie naming a profile that's since been removed) — that would need a DB read, a poor fit for Edge Middleware — so that narrower case is still deferred (harmless: the existing redirect-to-`/dashboard` fallback still fires correctly every time, it's just a repeated failed lookup, not a correctness bug).
- [x] [Review][Patch] `aria-current` is passed a raw boolean [src/components/parent/child-profile-switcher.tsx:72] — Fixed: now `aria-current={isActive ? 'true' : undefined}`.
- [x] [Review][Defer] No test coverage added for the new ownership check, cookie-signing, or `(student)` gating logic [src/app/(parent)/profiles/actions.ts, src/lib/child-profile-cookie.ts] — deferred, pre-existing: no test framework exists in this repo yet; the Epic 1 retrospective action item already tracks adding one before Epic 3, not this story.
