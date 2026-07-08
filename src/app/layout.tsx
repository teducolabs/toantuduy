import type { Metadata } from 'next'
import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const baloo2 = Baloo_2({
  subsets: ['latin', 'vietnamese'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ToanTuDuy',
  description: 'Math practice app for Vietnamese students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${baloo2.variable} ${beVietnamPro.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
