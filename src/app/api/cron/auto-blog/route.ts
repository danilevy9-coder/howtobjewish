import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { shouldGenerate, getSettings } from '@/lib/auto-blog'
import { createServiceClient } from '@/lib/supabase/server'
import { getNextSignificantHoliday } from '@/lib/jewish-calendar'
import { callNextStep, type PipelineState, type ExistingPost } from '@/lib/auto-blog-pipeline'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if it's time to generate
    const { ready, reason } = await shouldGenerate()
    if (!ready) {
      return NextResponse.json({ skipped: true, reason })
    }

    const settings = await getSettings()
    const supabase = await createServiceClient()

    // Determine topic type (alternate festival/general)
    const topicType: 'festival' | 'general' =
      settings.last_topic_type === 'festival' ? 'general' : 'festival'

    // Fetch context in parallel
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

    const effectiveType =
      topicType === 'festival' && !holiday ? 'general' : topicType

    const runId = crypto.randomUUID().slice(0, 8)

    const state: PipelineState = {
      runId,
      topicType,
      effectiveType,
      settings,
      existingPosts: (existingPosts || []) as ExistingPost[],
      categories: categories || [],
      holiday,
    }

    console.log(`[auto-blog:${runId}] Pipeline started (${effectiveType})`)

    // Fire-and-forget: kick off the pipeline
    after(() => callNextStep('/api/auto-blog/pipeline/pick-topic', state))

    return NextResponse.json({
      success: true,
      message: 'Pipeline started',
      runId,
      topicType: effectiveType,
    })
  } catch (error) {
    console.error('[auto-blog] Cron init error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
