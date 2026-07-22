---
title: 'Exit to Parent Dashboard from Student Home Screen'
type: 'feature'
created: '2026-07-23'
status: 'done'
route: 'one-shot'
---

# Exit to Parent Dashboard from Student Home Screen

## Intent

**Problem:** On the student home screen (`/`, `RootPage`), once a Child Profile is active there was no on-screen way back to the Parent Dashboard — only the practice/session screen had this affordance (added in `spec-student-session-exit-to-dashboard.md`), leaving the home screen itself a dead end for a parent who wants to switch back.

**Approach:** Reuse the existing `ExitToDashboardLink` component (icon + label, links to `/dashboard`) and render it at the top of all three student-home render branches: active-session resume, free-tier-gated, and normal home.

## Suggested Review Order

**Entry point**

- Reused component, no changes needed — same safety rationale as the session-screen version (`(parent)/layout.tsx` only checks `session.user.role`, not the child-profile cookie).
  [`exit-to-dashboard-link.tsx:8`](../../src/components/student/exit-to-dashboard-link.tsx#L8)

**UI binding**

- Link added to all three render branches of the student home page so no state (resuming, gated, or fresh) is a dead end.
  [`page.tsx:27`](../../src/app/page.tsx#L27)
  [`page.tsx:37`](../../src/app/page.tsx#L37)
