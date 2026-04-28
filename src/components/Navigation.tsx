'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    name: 'Start Here',
    href: '/start-here/',
    children: [
      { name: 'Getting Started', href: '/category/core-concepts/getting-started/' },
      { name: 'How to Find a Rabbi', href: '/category/core-concepts/how-to-find-a-rabbi/' },
      { name: 'Jewish Jargon Guide', href: '/jewish-jargon-guide/' },
      { name: 'Explain Judaism to Partner', href: '/explain-judaism-to-partner/' },
      { name: 'Converting to Judaism', href: '/how-to-convert-to-judaism/' },
      { name: 'Interfaith Relationships', href: '/navigating-interfaith-relationships/' },
    ],
  },
  {
    name: 'Beliefs',
    href: '/category/core-concepts/',
    children: [
      { name: 'How to Be Jewish', href: '/category/core-concepts/how-to-be-jewish/' },
      { name: 'Torah Basics', href: '/category/core-concepts/torah-basics/' },
      { name: 'Torah Learning', href: '/category/core-concepts/torah-learning/' },
      { name: 'Teshuvah', href: '/category/core-concepts/teshuvah/' },
      { name: 'Jewish Identity', href: '/category/core-concepts/jewish-identity/' },
      { name: 'Jewish History', href: '/category/community-and-culture/jewish-history/' },
      { name: 'Ethics & Values', href: '/category/core-concepts/ethics-and-values/' },
    ],
  },
  {
    name: 'Shabbat',
    href: '/category/shabbat/',
  },
  {
    name: 'Practice',
    href: '/category/festivals/',
    children: [
      { name: 'Festivals', href: '/category/festivals/' },
      { name: 'Elul', href: '/category/festivals/elul/' },
      { name: 'Rosh Hashanah', href: '/category/festivals/rosh-hashanah/' },
      { name: 'Yom Kippur', href: '/category/festivals/yom-kippur/' },
      { name: 'Sukkot', href: '/category/festivals/sukkot/' },
      { name: 'Shemini Atzeret', href: '/category/festivals/shemini-atzeret/' },
      { name: 'Simchat Torah', href: '/category/festivals/simchat-torah/' },
      { name: 'Chanukah', href: '/category/festivals/chanukah/' },
      { name: 'Purim', href: '/category/festivals/purim/' },
      { name: 'Passover', href: '/category/festivals/passover/' },
      { name: 'Shavuot', href: '/category/festivals/shavuot/' },
      { name: 'Holidays', href: '/category/festivals/holidays/' },
      { name: 'Customs', href: '/category/core-concepts/customs/' },
      { name: 'Mitzvot', href: '/category/core-concepts/mitzvot/' },
      { name: 'Kashrut', href: '/category/core-concepts/kashrut/' },
      { name: 'Jewish Practice', href: '/category/core-concepts/jewish-practice/' },
      { name: 'Jewish Traditions', href: '/category/core-concepts/jewish-traditions/' },
    ],
  },
  {
    name: 'Life & Community',
    href: '/category/family-and-community/',
    children: [
      { name: 'Family & Community', href: '/category/family-and-community/' },
      { name: 'Children', href: '/category/family-and-community/children/' },
      { name: 'Family Purity', href: '/category/family-and-community/family-purity/' },
      { name: 'Lifecycle Events', href: '/category/family-and-community/lifecycle-events/' },
      { name: 'Teens', href: '/category/family-and-community/teens/' },
      { name: 'Community & Culture', href: '/category/community-and-culture/' },
      { name: 'Laws', href: '/category/core-concepts/laws/' },
      { name: 'Prayer', href: '/category/prayer/' },
      { name: 'Liturgy', href: '/category/prayer/liturgy/' },
      { name: 'Jewish Texts', href: '/category/prayer/jewish-texts/' },
      { name: 'Torah Readings', href: '/category/prayer/torah-readings/' },
    ],
  },
  { name: 'Shop', href: '/shop/' },
  { name: 'Contact', href: '/contact/' },
]

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>(null)

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              H
            </div>
            <div>
              <span className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
                How to Be Jewish
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[var(--gold)] font-medium -mt-0.5">
                Your Judgment-Free Guide
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-[var(--accent)] transition-colors rounded-md hover:bg-[var(--cream)]"
                >
                  {item.name}
                  {item.children && <ChevronDown className="w-3 h-3" />}
                </Link>

                {item.children && openDropdown === item.name && (
                  <div className="absolute top-full left-0 bg-white border border-[var(--border)] shadow-xl rounded-lg py-2 min-w-[260px] max-h-[70vh] overflow-y-auto mt-0.5">
                    <div className="px-4 py-2 border-b border-[var(--border)]">
                      <Link href={item.href} className="text-xs font-semibold uppercase tracking-wider text-[var(--gold)] hover:text-[var(--accent)]">
                        View All {item.name}
                      </Link>
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-[var(--cream)] hover:text-[var(--accent)] transition-colors"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-[var(--cream)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-[var(--border)] max-h-[80vh] overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.name} className="border-b border-gray-100">
              {item.children ? (
                <>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-[var(--cream)]"
                    onClick={() =>
                      setOpenMobileAccordion(
                        openMobileAccordion === item.name ? null : item.name
                      )
                    }
                  >
                    {item.name}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform text-[var(--gold)] ${
                        openMobileAccordion === item.name ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {openMobileAccordion === item.name && (
                    <div className="bg-[var(--cream)] pb-2">
                      <Link
                        href={item.href}
                        className="block px-8 py-2.5 text-sm text-[var(--accent)] font-medium"
                        onClick={() => setMobileOpen(false)}
                      >
                        View All
                      </Link>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-8 py-2.5 text-sm text-gray-600 hover:text-[var(--accent)]"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className="block px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-[var(--cream)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
