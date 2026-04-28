import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[var(--foreground)] text-white">
      {/* Gold accent line */}
      <div className="h-1 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-light)]" />

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              How to Be Jewish
            </h3>
            <div className="w-10 h-0.5 bg-[var(--gold)] mb-4" />
            <p className="text-gray-400 text-sm leading-relaxed" style={{ fontFamily: "'Crimson Text', serif", fontSize: '1rem' }}>
              Practical, beginner-friendly guides to Jewish life. Your judgment-free companion on the journey.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              Getting Started
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/where-to-begin-your-jewish-journey/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Start Here</Link></li>
              <li><Link href="/finding-a-mentor-or-rabbi/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Find a Rabbi</Link></li>
              <li><Link href="/how-to-convert-to-judaism/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Conversion Guide</Link></li>
              <li><Link href="/what-does-it-mean-to-be-jewish/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">What Is Judaism?</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              Popular Topics
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/category/shabbat/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Shabbat</Link></li>
              <li><Link href="/category/festivals/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Jewish Holidays</Link></li>
              <li><Link href="/category/core-concepts/kashrut/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Keeping Kosher</Link></li>
              <li><Link href="/category/core-concepts/torah-basics/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Torah Basics</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              Connect
            </h4>
            <ul className="space-y-2.5">
              <li><Link href="/about/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">About</Link></li>
              <li><Link href="/contact/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Contact</Link></li>
              <li><Link href="/shop/" className="text-gray-400 hover:text-[var(--gold-light)] text-sm transition-colors">Shop</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} How to Be Jewish. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs" style={{ fontFamily: "'Crimson Text', serif" }}>
            &ldquo;In a place where there are no leaders, strive to be a leader.&rdquo; &mdash; Pirkei Avot 2:5
          </p>
        </div>
      </div>
    </footer>
  )
}
