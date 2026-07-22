---
title: 'Exit to Parent Dashboard from Student Practice Screen'
type: 'feature'
created: '2026-07-23'
status: 'done'
route: 'one-shot'
---

# Exit to Parent Dashboard from Student Practice Screen

## Intent

**Problem:** Once inside a Child Profile's practice session, there was no on-screen way to return to the Parent Dashboard — the parent's NextAuth session and the active-child cookie are independent, so navigating to `/dashboard` always worked, but no affordance surfaced it.

**Approach:** Add a small `ExitToDashboardLink` (icon + label) to the top of the student session screen — both the normal question view and the empty-questions dead-end state — and to its loading skeleton, linking to `/dashboard`.

## Suggested Review Order

**Entry point**

- New reusable link component: icon + visible label (not icon-only, per review — young readers need the text), safe because `(parent)/layout.tsx` only checks `session.user.role`, not the child-profile cookie.
  [`exit-to-dashboard-link.tsx:8`](../../src/components/student/exit-to-dashboard-link.tsx#L8)

**UI binding**

- Link placed in both render branches of the session page so a stuck/empty session is never a dead end.
  [`page.tsx:38`](../../src/app/(student)/session/%5BsessionId%5D/page.tsx#L38)
  [`page.tsx:55`](../../src/app/(student)/session/%5BsessionId%5D/page.tsx#L55)

- Loading skeleton also renders the link so it's available immediately, not just after the question data resolves.
  [`loading.tsx:7`](../../src/app/(student)/session/%5BsessionId%5D/loading.tsx#L7)

**Peripherals**

- New locale string for the link label.
  [`student.ts:30`](../../src/locales/vi/student.ts#L30)
