'use client'

import { useEffect } from 'react'
import { Volume2 } from 'lucide-react'
import { student } from '@/locales/vi/student'

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  window.speechSynthesis.speak(utterance)
}

export function AudioButton(props: { text: string; autoPlay: boolean }) {
  const { text, autoPlay } = props

  useEffect(() => {
    if (autoPlay) speak(text)
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <button
      type="button"
      data-slot="audio-button"
      className="inline-flex min-h-11 min-w-11 items-center gap-1 text-label-student text-primary"
      onClick={() => speak(text)}
    >
      <Volume2 aria-hidden="true" />
      {student.listenAgain}
    </button>
  )
}
