import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'About How to Be Jewish - practical, judgment-free guides to Jewish life.',
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1
        className="text-3xl md:text-4xl font-bold mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        About How to Be Jewish
      </h1>

      <div className="prose max-w-none">
        <p>
          <strong>How to Be Jewish</strong> is a practical, beginner-friendly resource for anyone
          exploring Jewish life. Whether you&apos;re just curious, beginning to observe, or deepening
          your existing practice, our guides are written to meet you exactly where you are.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe that Jewish wisdom belongs to everyone willing to learn. Our articles break down
          complex topics — from Shabbat observance to kosher laws to holiday celebrations — into clear,
          actionable guides that respect tradition while remaining accessible to beginners.
        </p>

        <h2>Who We Are</h2>
        <p>
          How to Be Jewish was created by Rabbi D Levy with a simple goal: to provide a
          judgment-free space where anyone can learn about Jewish life at their own pace. Every
          article is carefully researched and rooted in traditional Jewish sources.
        </p>

        <h2>What You&apos;ll Find Here</h2>
        <ul>
          <li>Step-by-step guides to Jewish observance and practice</li>
          <li>Clear explanations of holidays, Shabbat, and daily routines</li>
          <li>Practical kosher living guides</li>
          <li>Life cycle event guides (weddings, bar/bat mitzvah, naming, mourning)</li>
          <li>Jewish history, beliefs, and ethical teachings</li>
        </ul>
      </div>
    </div>
  )
}
