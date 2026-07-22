---
title: 'Profile Management Quick-Switch Button'
type: 'feature'
created: '2026-07-23'
status: 'done'
review_loop_iteration: 0
context: []
route: 'one-shot'
---

# Profile Management Quick-Switch Button

## Intent

**Problem:** On the Parent Dashboard, the only way to activate a Child Profile was the `ChildProfileSwitcher` sheet in the top nav — the Profile Management screen (`/profiles`) listed profiles with Rename/Delete actions only, with no direct "select this profile" affordance.

**Approach:** Add a "Chọn" (Select) button to each non-active profile card in `ChildProfileList`, reusing the existing `switchActiveChildProfileAction` server action unchanged. The active profile's card shows "Đang chọn" (Currently selected) instead of the button.

## Suggested Review Order

**Selection flow (shared state, race-safety)**

- Shared `switchingId` state lives in the list, not per-button, so clicking two different profiles in quick succession can't race (fixed post-review).
  [`child-profile-list.tsx:28`](../../src/components/parent/child-profile-list.tsx#L28)

- Active-vs-selectable branch per card; `aria-current` moved onto the `<li>` itself rather than an inert span (fixed post-review).
  [`child-profile-list.tsx:50`](../../src/components/parent/child-profile-list.tsx#L50)

- Presentational button shows a loading label and a per-child `aria-label` while switching (fixed post-review).
  [`select-child-profile-button.tsx:23`](../../src/components/parent/select-child-profile-button.tsx#L23)

**Wiring**

- Page now reads the active Child Profile from the signed cookie and passes it to the list, mirroring the pattern already used by `(parent)/layout.tsx` and the dashboard page.
  [`page.tsx:22`](../../src/app/(parent)/profiles/page.tsx#L22)

**Copy**

- New Vietnamese strings for the select CTA and active-profile label.
  [`profiles.ts:41`](../../src/locales/vi/profiles.ts#L41)
