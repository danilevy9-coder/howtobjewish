import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'How to Be Jewish - Practical Guides to Jewish Life',
    template: '%s | How to Be Jewish',
  },
  description: 'Practical, beginner-friendly guides to Jewish life. Your judgment-free companion on the journey.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'How to Be Jewish',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[var(--background)]">
        <Navigation />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
