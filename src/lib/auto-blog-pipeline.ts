/**
 * Auto-blog pipeline utilities for chained API route execution.
 *
 * The blog generation pipeline is split into 5 steps, each under 60s
 * (Vercel Hobby limit). Each step calls the next via fire-and-forget fetch.
 */

import type { AutoBlogSettings } from './auto-blog'
import type { JewishHoliday } from './jewish-calendar'

// ═══════════════════════ Types ═══════════════════════

export interface ExistingPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
}

export interface TopicPlan {
  topic: string
  seoTitle: string
  longTailKeywords: string[]
  interlinkSlugs: string[]
  categorySlug: string
  useQAFormat: boolean
  imageSearchQuery: string
}

export interface PipelineState {
  runId: string
  topicType: 'festival' | 'general'
  effectiveType: 'festival' | 'general'
  settings: AutoBlogSettings
  existingPosts: ExistingPost[]
  categories: { id: string; name: string; slug: string }[]
  holiday: JewishHoliday | null
  plan?: TopicPlan
  article?: {
    title: string
    content: string
    excerpt: string
    metaTitle: string
  }
  metaDescription?: string
  featuredImage?: string | null
}

// ═══════════════════════ Helpers ═══════════════════════

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export function verifyPipelineAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

/**
 * Fire-and-forget call to the next pipeline step.
 * Uses fetch without awaiting the response body.
 */
export function callNextStep(path: string, state: PipelineState): Promise<void> {
  const url = `${getBaseUrl()}${path}`
  console.log(`[auto-blog:${state.runId}] -> Calling next step: ${path}`)

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify(state),
  }).then(() => {
    console.log(`[auto-blog:${state.runId}] -> Step dispatched: ${path}`)
  }).catch((err) => {
    console.error(`[auto-blog:${state.runId}] -> Failed to dispatch ${path}:`, err)
  })
}
