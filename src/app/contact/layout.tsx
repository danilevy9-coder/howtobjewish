import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with How to Be Jewish with a question, a correction or an idea for a guide.',
  alternates: { canonical: '/contact/' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
