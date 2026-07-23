'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/locales/vi/auth'
import { profiles } from '@/locales/vi/profiles'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { registerTeacher } from './actions'
import type { GradeBand } from '@prisma/client'

const GRADE_BAND_OPTIONS: GradeBand[] = ['GRADE_1', 'GRADE_2', 'GRADE_3']

export default function TeacherRegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [gradeTaught, setGradeTaught] = useState<GradeBand | null>(null)
  const [email, setEmail] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [schoolNameError, setSchoolNameError] = useState<string | null>(null)
  const [gradeTaughtError, setGradeTaughtError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError(null)
    setSchoolNameError(null)
    setGradeTaughtError(null)
    setEmailError(null)
    setError(null)

    if (!name.trim()) {
      setNameError(auth.teacherNameRequired)
      return
    }
    if (!schoolName.trim()) {
      setSchoolNameError(auth.teacherSchoolNameRequired)
      return
    }
    if (!gradeTaught) {
      setGradeTaughtError(auth.teacherGradeTaughtRequired)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await registerTeacher({ name, schoolName, gradeTaught, email })

      if ('error' in result) {
        switch (result.error.code) {
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

      router.push('/register/teacher/pending')
    } catch {
      setError(auth.registrationFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-heading">{auth.teacherRegisterTitle}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-body">
            {auth.teacherNameLabel}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            aria-describedby={nameError ? 'name-error' : undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
          {nameError && (
            <p id="name-error" role="alert" className="text-sm text-feedback-incorrect">
              {nameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="schoolName" className="text-body">
            {auth.teacherSchoolNameLabel}
          </label>
          <input
            id="schoolName"
            name="schoolName"
            type="text"
            required
            maxLength={150}
            aria-describedby={schoolNameError ? 'schoolName-error' : undefined}
            value={schoolName}
            onChange={(event) => setSchoolName(event.target.value)}
            className="rounded-brand-sm border border-gray-300 px-3 py-2"
          />
          {schoolNameError && (
            <p id="schoolName-error" role="alert" className="text-sm text-feedback-incorrect">
              {schoolNameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="gradeTaught" className="text-body">
            {auth.teacherGradeTaughtLabel}
          </label>
          <Select value={gradeTaught} onValueChange={(value) => setGradeTaught(value as GradeBand)}>
            <SelectTrigger id="gradeTaught" className="w-full" aria-describedby={gradeTaughtError ? 'gradeTaught-error' : undefined}>
              <SelectValue placeholder={auth.teacherGradeTaughtPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {GRADE_BAND_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {profiles.gradeBandLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gradeTaughtError && (
            <p id="gradeTaught-error" role="alert" className="text-sm text-feedback-incorrect">
              {gradeTaughtError}
            </p>
          )}
        </div>

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
