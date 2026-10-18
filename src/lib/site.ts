import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// One canonical address for the whole site (the bare domain redirects here).
export const SITE_URL = 'https://www.howtobjewish.org'
export const SITE_NAME = 'How to Be Jewish'

// Cookie-free read client for public pages, so they can be cached (ISR).
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Placeholder pages that now 301 to the full guide (see next.config.ts).
export const REDIRECTED_SLUGS = new Set<string>([
  'jewish-mourning-and-shiva',
  'jewish-clothing-and-modesty',
  'what-is-a-synagogue',
  'bar-and-bat-mitzvah-guide',
  'jewish-wedding-traditions-3',
])

// Post slugs that collide with fixed pages of the site (served by those pages instead).
export const RESERVED_SLUGS = new Set<string>(['about', 'contact', 'shop', 'login', 'admin', 'category'])

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  return SITE_URL + (path.startsWith('/') ? path : '/' + path)
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', hellip: '...', mdash: ', ', ndash: ', ' }

export function htmlToText(html: string | null | undefined) {
  if (!html) return ''
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[\u2013\u2014]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

// A description of about 155 characters cut on a word boundary.
export function summarize(text: string, max = 155) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:.]+$/, '') + '...'
}

export function postDescription(post: { meta_description?: string | null; excerpt?: string | null; content?: string | null; title?: string }) {
  const own = (post.meta_description || '').trim() || htmlToText(post.excerpt || '').trim()
  if (own) return own
  let raw = post.content || ''
  if (raw.startsWith('<!--B64-->')) raw = Buffer.from(raw.slice(10), 'base64').toString('utf8')
  let body = htmlToText(raw)
  // Drop a leading heading that only repeats "Introduction" or the title.
  body = body.replace(/^introduction\s+/i, '')
  if (post.title && body.toLowerCase().startsWith(post.title.toLowerCase())) body = body.slice(post.title.length).trim()
  return body ? summarize(body) : `${post.title || 'A guide'}: a practical guide from ${SITE_NAME}.`
}

// Lazy-load images inside article HTML (none of them is the first thing on screen).
export function lazyImages(html: string) {
  return html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"')
}

// FAQ: only real question headings inside a "Common Questions" / "FAQ" section.
export function extractFaq(html: string): { q: string; a: string }[] {
  if (!html) return []
  const sec = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  let m: RegExpExecArray | null
  const out: { q: string; a: string }[] = []
  const heads: { idx: number; end: number; text: string }[] = []
  while ((m = sec.exec(html))) heads.push({ idx: m.index, end: sec.lastIndex, text: htmlToText(m[1]) })
  heads.forEach((h, i) => {
    if (!/(faq|frequently asked|common questions|questions answered)/i.test(h.text)) return
    const body = html.slice(h.end, i + 1 < heads.length ? heads[i + 1].idx : html.length)
    const parts = body.split(/(?=<h3[^>]*>)/i)
    for (const part of parts) {
      const qm = part.match(/^<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/i)
      if (!qm) continue
      const q = htmlToText(qm[1]).replace(/^["\u201c\u2018']+|["\u201d\u2019']+$/g, '').trim()
      const a = htmlToText(qm[2])
      if (q.endsWith('?') && a.length > 20) out.push({ q, a })
    }
  })
  return out.length >= 2 ? out : []
}

// Related sites, shown only on guides where they fit the topic.
export const TRAVEL_CATEGORIES = new Set(['kosher-travel'])
export const LEARNING_CATEGORIES = new Set(['torah-learning', 'torah-readings', 'torah-basics', 'jewish-texts'])

export function partnerLinks(categorySlugs: string[]) {
  const links: { name: string; href: string; text: string }[] = []
  if (categorySlugs.some((s) => TRAVEL_CATEGORIES.has(s))) {
    links.push({ name: 'The Kosher Safari', href: 'https://thekoshersafari.com/', text: 'Glatt kosher luxury safaris in Africa, with Shabbat and minyan planned in.' })
    links.push({ name: 'Kosher Travel Deals', href: 'https://koshertraveldeals.com/', text: 'Kosher hotels, Pesach programs and travel offers in one place.' })
  }
  if (categorySlugs.some((s) => LEARNING_CATEGORIES.has(s))) {
    links.push({ name: 'Sfas Emes', href: 'https://sfasemes.org/', text: 'The Sfas Emes on every parsha and festival, in Hebrew with an English translation.' })
    links.push({ name: 'Ohr HaChaim', href: 'https://ohr-hachaim.com/', text: 'The Ohr HaChaim commentary on the Torah, explained in English.' })
  }
  return links
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
