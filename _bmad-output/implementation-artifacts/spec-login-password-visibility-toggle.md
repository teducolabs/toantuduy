---
title: 'Login Password Visibility Toggle'
type: 'feature'
created: '2026-07-14'
status: 'done'
route: 'one-shot'
---

# Login Password Visibility Toggle

## Intent

**Problem:** Users on the login page cannot verify what they typed into the password field, since it always renders as masked dots.

**Approach:** Add an eye icon toggle button inside the password field on `login-form.tsx` that switches the input's `type` between `password` and `text`, with proper `aria-label`/`aria-pressed` state.

## Suggested Review Order

1. [src/locales/vi/auth.ts](../../src/locales/vi/auth.ts) — new `showPassword`/`hidePassword` label strings.
2. [src/app/login/login-form.tsx](../../src/app/login/login-form.tsx) — toggle state, icon button, and input `type` wiring.
