/**
 * Auto-blog generation pipeline.
 *
 * Flow:
 *   1. Decide topic type (festival vs. general) — alternates each run
 *   2. Fetch context (Jewish calendar, existing posts, categories)
 *   3. Ask Gemini to pick a topic + identify interlink targets
 *   4. Ask Gemini to write the full article (TL;DR, Q&A, interlinks baked in)
 *   5. Generate SEO meta title + description
 *   6. Fetch + upload featured image
 *   7. Save to DB and assign category
 */

import { createServiceClient } from '@/lib/supabase/server'
import { generateContent } from '@/lib/gemini'
import { getNextSignificantHoliday, isShabbat, type JewishHoliday } from '@/lib/jewish-calendar'
import { getPhotoUrl } from '@/lib/unsplash'
import { uploadFromUrl } from '@/lib/cloudinary'

// ═══════════════════════ Types ═══════════════════════

interface ExistingPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
}

interface TopicPlan {
  topic: string
  seoTitle: string
  longTailKeywords: string[]
  interlinkSlugs: string[]
  categorySlug: string
  useQAFormat: boolean
  imageSearchQuery: string
}

interface GeneratedPost {
  title: string
  slug: string
  content: string
  excerpt: string
  metaTitle: string
  metaDescription: string
  categoryId: string | null
  featuredImage: string | null
}

// ═══════════════════════ Settings ═══════════════════════

export interface AutoBlogSettings {
  is_active: boolean
  min_hours_between: number  // e.g. 18
  max_hours_between: number  // e.g. 30
  auto_publish: boolean
  last_generated_at: string | null
  next_generate_after: string | null
  last_topic_type: 'festival' | 'general' | null
}

const DEFAULT_SETTINGS: AutoBlogSettings = {
  is_active: true,
  min_hours_between: 20,
  max_hours_between: 28,
  auto_publish: true,
  last_generated_at: null,
  next_generate_after: null,
  last_topic_type: null,
}

// ═══════════════════════ Settings CRUD ═══════════════════════

export async function getSettings(): Promise<AutoBlogSettings> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('auto_blog_settings')
    .select('*')
    .limit(1)
    .single()

  return data || DEFAULT_SETTINGS
}

export async function updateSettings(
  updates: Partial<AutoBlogSettings>
): Promise<void> {
  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('auto_blog_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from('auto_blog_settings')
      .update(updates)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('auto_blog_settings')
      .insert({ ...DEFAULT_SETTINGS, ...updates })
  }
}

// ═══════════════════════ Readiness Check ═══════════════════════

export async function shouldGenerate(): Promise<{
  ready: boolean
  reason: string
}> {
  const settings = await getSettings()

  if (!settings.is_active) {
    return { ready: false, reason: 'Auto-blog is disabled' }
  }

  // Check Shabbat — never publish on Shabbat
  const shabbatNow = await isShabbat('Asia/Jerusalem')
  if (shabbatNow) {
    return { ready: false, reason: 'Shabbat — no publishing until after Havdalah' }
  }

  if (settings.next_generate_after) {
    const nextTime = new Date(settings.next_generate_after)
    if (new Date() < nextTime) {
      return {
        ready: false,
        reason: `Next generation scheduled for ${nextTime.toISOString()}`,
      }
    }
  }

  return { ready: true, reason: 'Ready to generate' }
}

// ═══════════════════════ Schedule Next Run ═══════════════════════

function scheduleNext(settings: AutoBlogSettings): string {
  const minMs = settings.min_hours_between * 60 * 60 * 1000
  const maxMs = settings.max_hours_between * 60 * 60 * 1000
  const randomMs = minMs + Math.random() * (maxMs - minMs)
  return new Date(Date.now() + randomMs).toISOString()
}

// ═══════════════════════ Topic Generation ═══════════════════════

async function pickTopic(
  topicType: 'festival' | 'general',
  existingPosts: ExistingPost[],
  holiday: JewishHoliday | null,
  categories: { id: string; name: string; slug: string }[]
): Promise<TopicPlan> {
  const existingTitles = existingPosts
    .map((p) => `- "${p.title}" (/${p.slug}/)`)
    .join('\n')

  const categoryList = categories
    .map((c) => `- ${c.name} (${c.slug})`)
    .join('\n')

  const holidayContext =
    topicType === 'festival' && holiday
      ? `\nUPCOMING HOLIDAY: ${holiday.title} (${holiday.hebrew}) is in ${holiday.daysUntil} days (${holiday.date}). The topic MUST relate to this holiday or its preparation/customs/meaning.\n`
      : '\nThis should be a GENERAL Jewish topic — not tied to any specific holiday. Think: daily Jewish living, mitzvot, ethics, Torah concepts, kashrut, prayer, community, identity, lifecycle events.\n'

  // Randomly decide Q&A format (~50%)
  const useQAFormat = Math.random() < 0.5

  const prompt = `You are a Jewish content strategist for howtobjewish.org, a site aimed at people new to Judaism, written from an Orthodox-lite perspective.

Your job: suggest ONE blog post topic that would perform well in search engines.
${holidayContext}
EXISTING BLOG POSTS (do NOT duplicate these topics — find a fresh angle):
${existingTitles}

AVAILABLE CATEGORIES:
${categoryList}

REQUIREMENTS:
- The topic must target a long-tail SEO keyword (e.g. "how to set a shabbat table for beginners" not just "shabbat")
- It should be something real people search for on Google
- It must be factually accurate from a mainstream Orthodox perspective
- Pick 3-8 existing posts from the list above that this new article should link to
- Pick the single best category from the list above

FORMAT: Respond ONLY with valid JSON, no markdown fences:
{
  "topic": "The full topic/title as it would appear on the blog",
  "seoTitle": "SEO-optimized title tag (under 60 chars)",
  "longTailKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "interlinkSlugs": ["slug-1", "slug-2", "slug-3"],
  "categorySlug": "the-category-slug",
  "imageSearchQuery": "2-4 word Unsplash search query for a relevant featured image"
}`

  const response = await generateContent(prompt)

  // Parse JSON from response (handle possible markdown fences)
  const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const plan = JSON.parse(jsonStr) as Omit<TopicPlan, 'useQAFormat'>

  return { ...plan, useQAFormat }
}

// ═══════════════════════ Article Writing ═══════════════════════

async function writeArticle(
  plan: TopicPlan,
  existingPosts: ExistingPost[]
): Promise<{ title: string; content: string; excerpt: string; metaTitle: string; metaDescription: string }> {
  // Build interlink reference
  const interlinkPosts = existingPosts
    .filter((p) => plan.interlinkSlugs.includes(p.slug))
    .map((p) => `- "${p.title}": <a href="/${p.slug}/">${p.title}</a>`)
    .join('\n')

  const formatInstruction = plan.useQAFormat
    ? `IMPORTANT: Start this article with a question-and-answer format. Open with a clear, searchable question as an H2 (e.g., "## What Is...?" or "## How Do You...?"), then give a direct 2-3 sentence answer before expanding into the full article.`
    : `Start with an engaging introduction that draws the reader in.`

  const prompt = `You are an expert Jewish educator writing for howtobjewish.org. Your audience is people who know little about Judaism but are curious and sincere. Write from a mainstream Orthodox perspective but with a warm, modern, non-judgmental tone. Never cite sources parenthetically (no "(Shulchan Aruch 123:4)") — instead weave references naturally ("The Talmud teaches us..." or "According to Jewish law...").

ARTICLE TOPIC: ${plan.topic}

TARGET SEO KEYWORDS: ${plan.longTailKeywords.join(', ')}

STRUCTURE REQUIREMENTS:
1. Start with a TL;DR section — a brief 2-4 sentence summary in a box format like:
   <div class="tldr"><strong>TL;DR:</strong> [concise summary]</div>

2. ${formatInstruction}

3. Use H2 and H3 headings to organize content. Headings should be keyword-rich where natural.

4. Aim for 1800-2800 words. Be thorough but readable.

5. Include relevant Hebrew terms with transliterations in parentheses.

6. INTERNAL LINKS — You MUST weave these links naturally into the article body (3-8 links). Use varied, natural anchor text (2-5 words), NOT the full article title:
${interlinkPosts}

7. Include a practical takeaway or "Getting Started" section where applicable.

8. End with a warm, encouraging conclusion.

9. Use HTML formatting: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <a href>. Do NOT use markdown.

10. Do NOT include any image tags or placeholders.

TONE: Warm, clear, accurate, welcoming. Like a knowledgeable friend explaining things over coffee. Never condescending, never preachy.`

  const content = await generateContent(prompt)

  // Extract title
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
    content.match(/<h2[^>]*>(.*?)<\/h2>/i)
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
    : plan.topic

  // Generate SEO meta
  const metaPrompt = `Write an SEO meta description (150-160 chars) for this article:
Title: "${plan.seoTitle}"
Keywords: ${plan.longTailKeywords.join(', ')}
Topic: ${plan.topic}

Respond with ONLY the meta description text, nothing else.`

  const metaDescription = (await generateContent(metaPrompt)).trim().replace(/^["']|["']$/g, '')

  // Generate excerpt
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const excerpt = plainText.slice(0, 250).replace(/\s\S*$/, '') + '...'

  return {
    title,
    content,
    excerpt,
    metaTitle: plan.seoTitle,
    metaDescription,
  }
}

// ═══════════════════════ Image ═══════════════════════

async function fetchImage(query: string): Promise<string | null> {
  try {
    const photoUrl = await getPhotoUrl(query)
    if (!photoUrl) return null
    return await uploadFromUrl(photoUrl)
  } catch (err) {
    console.error('Image fetch/upload failed:', err)
    return null
  }
}

// ═══════════════════════ Main Pipeline ═══════════════════════

export async function generateBlogPost(): Promise<GeneratedPost> {
  const supabase = await createServiceClient()
  const settings = await getSettings()

  // 1. Determine topic type (alternate festival/general)
  const topicType: 'festival' | 'general' =
    settings.last_topic_type === 'festival' ? 'general' : 'festival'

  console.log(`[auto-blog] Topic type: ${topicType}`)

  // 2. Fetch context
  const [holiday, { data: existingPosts }, { data: categories }] =
    await Promise.all([
      topicType === 'festival'
        ? getNextSignificantHoliday()
        : Promise.resolve(null),
      supabase
        .from('posts')
        .select('id, title, slug, excerpt')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(300),
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name'),
    ])

  const posts = (existingPosts || []) as ExistingPost[]
  const cats = categories || []

  // If festival requested but no upcoming holiday, fall back to general
  const effectiveType =
    topicType === 'festival' && !holiday ? 'general' : topicType

  if (effectiveType === 'festival') {
    console.log(
      `[auto-blog] Upcoming holiday: ${holiday!.title} in ${holiday!.daysUntil} days`
    )
  }

  // 3. Pick topic + interlink targets
  console.log('[auto-blog] Generating topic...')
  const plan = await pickTopic(effectiveType, posts, holiday, cats)
  console.log(`[auto-blog] Topic: "${plan.topic}"`)
  console.log(`[auto-blog] Interlinks: ${plan.interlinkSlugs.join(', ')}`)
  console.log(`[auto-blog] Format: ${plan.useQAFormat ? 'Q&A' : 'Standard'}`)

  // 4. Write the article
  console.log('[auto-blog] Writing article...')
  const article = await writeArticle(plan, posts)

  // 5. Fetch featured image
  console.log(`[auto-blog] Fetching image: "${plan.imageSearchQuery}"`)
  const featuredImage = await fetchImage(plan.imageSearchQuery)

  // 6. Resolve category
  const matchedCat = cats.find((c) => c.slug === plan.categorySlug)
  const categoryId = matchedCat?.id || null

  // 7. Generate slug
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  // 8. Get default author
  const { data: author } = await supabase
    .from('authors')
    .select('id')
    .limit(1)
    .single()

  // 9. Save to DB
  const status = settings.auto_publish ? 'published' : 'queued'
  const publishedAt = settings.auto_publish ? new Date().toISOString() : null

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title: article.title,
      slug,
      content: article.content,
      excerpt: article.excerpt,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      featured_image: featuredImage,
      author_id: author?.id || null,
      status,
      published_at: publishedAt,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to save post: ${error.message}`)
  }

  // 10. Assign category
  if (categoryId && post) {
    await supabase
      .from('post_categories')
      .insert({ post_id: post.id, category_id: categoryId })
  }

  // 11. Update settings: mark generation time + schedule next
  await updateSettings({
    last_generated_at: new Date().toISOString(),
    next_generate_after: scheduleNext(settings),
    last_topic_type: effectiveType,
  })

  console.log(`[auto-blog] Created: "${article.title}" (${status})`)

  return {
    title: article.title,
    slug,
    content: article.content,
    excerpt: article.excerpt,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    categoryId,
    featuredImage,
  }
}
