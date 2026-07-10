'use client'

import { useState, type FormEvent } from 'react'
import { auth } from '@/locales/vi/auth'
import { registerParent, resendVerificationEmail } from '@/app/register/actions'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function handleResend() {
    setIsResending(true)
    setResendMessage(null)
    try {
      const result = await resendVerificationEmail(email)
      setResendMessage('error' in result ? auth.resendFailed : auth.resendSuccess)
    } catch {
      setResendMessage(auth.resendFailed)
    } finally {
      setIsResending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)
    setError(null)

    if (password.length < 8) {
      setPasswordError(auth.passwordTooShort)
      return
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(auth.passwordMismatch)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await registerParent({ email, password, confirmPassword })

      if ('error' in result) {
        switch (result.error.code) {
          case 'PASSWORD_MISMATCH':
            setConfirmPasswordError(auth.passwordMismatch)
            break
          case 'PASSWORD_TOO_SHORT':
            setPasswordError(auth.passwordTooShort)
            break
          case 'INVALID_EMAIL':
            setEmailError(auth.invalidEmail)
            break
          case 'EMAIL_IN_USE':
            setError(auth.emailInUse)
            break
          default:
            setError(auth.registrationFailed)
        }
        return
      }

      setIsSuccess(true)
    } catch {
      setError(auth.registrationFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
        <h1 className="text-heading">{auth.registerTitle}</h1>
        <p role="status">{auth.registrationSuccess}</p>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-primary underline disabled:opacity-50"
        >
          {isResending ? auth.resendSubmitting : auth.resendLink}
        </button>

        {resendMessage && <p role="status">{resendMessage}</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-heading">{auth.registerTitle}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-body">
            {auth.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={emailError ? 'email-error' : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
          {emailError && (
            <p id="email-error" role="alert" className="text-sm text-feedback-incorrect">
              {emailError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-body">
            {auth.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={passwordError ? 'password-error' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
          {passwordError && (
            <p id="password-error" role="alert" className="text-sm text-feedback-incorrect">
              {passwordError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-body">
            {auth.confirmPasswordLabel}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={confirmPasswordError ? 'confirmPassword-error' : undefined}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
          {confirmPasswordError && (
            <p id="confirmPassword-error" role="alert" className="text-sm text-feedback-incorrect">
              {confirmPasswordError}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-feedback-incorrect">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-brand-sm bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isSubmitting ? auth.registerSubmitting : auth.registerSubmit}
        </button>
      </form>
    </main>
  )
}
