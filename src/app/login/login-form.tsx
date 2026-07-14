'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { auth } from '@/locales/vi/auth'

export function LoginFormSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-heading">{auth.title}</h1>
    </main>
  )
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn('credentials', { email, password, redirect: false })

      if (!result || result.error) {
        if (result?.code === 'email_not_verified') {
          setError(auth.emailNotVerified)
        } else if (result?.error === 'CredentialsSignin') {
          setError(auth.invalidCredentials)
        } else {
          setError(auth.signInFailed)
        }
        return
      }

      window.location.href = '/'
    } catch {
      setError(auth.signInFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    try {
      const result = await signIn('google', { redirect: false })
      if (result?.error) {
        setError(auth.signInFailed)
        return
      }
      window.location.href = '/'
    } catch {
      setError(auth.signInFailed)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-heading">{auth.title}</h1>

      {verified && (
        <p role="status" className="text-sm text-feedback-correct">
          {auth.emailVerifiedSuccess}
        </p>
      )}

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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-body">
            {auth.passwordLabel}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-brand-sm border border-gray-300 px-3 py-2 pr-10"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              aria-label={isPasswordVisible ? auth.hidePassword : auth.showPassword}
              aria-pressed={isPasswordVisible}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
            >
              {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
          {isSubmitting ? auth.submitting : auth.submit}
        </button>
      </form>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        {auth.or}
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="rounded-brand-sm border border-gray-300 px-4 py-2 font-semibold"
      >
        {auth.googleSignIn}
      </button>
    </main>
  )
}
