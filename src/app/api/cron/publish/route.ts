import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isShabbat } from '@/lib/jewish-calendar'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Never publish on Shabbat
    const shabbatNow = await isShabbat('Asia/Jerusalem')
    if (shabbatNow) {
      return NextResponse.json({ message: 'Shabbat — skipping publish' })
    }

    const supabase = await createServiceClient()

    // Get drip settings
    const { data: settings } = await supabase
      .from('drip_settings')
      .select('*')
      .limit(1)
      .single()

    if (!settings?.is_active) {
      return NextResponse.json({ message: 'Drip publishing is disabled' })
    }

    const postsPerDay = settings.posts_per_day || 1

    // Get queued posts ordered by scheduled_at, then created_at
    const { data: queuedPosts } = await supabase
      .from('posts')
      .select('id, title, slug')
      .eq('status', 'queued')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(postsPerDay)

    if (!queuedPosts || queuedPosts.length === 0) {
      return NextResponse.json({ message: 'No queued posts to publish' })
    }

    const published: string[] = []

    for (const post of queuedPosts) {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      if (!error) {
        published.push(post.title)
      }
    }

    return NextResponse.json({
      success: true,
      published,
      message: `Published ${published.length} post(s)`,
    })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
