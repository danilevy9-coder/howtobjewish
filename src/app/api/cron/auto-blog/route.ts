import { NextRequest, NextResponse } from 'next/server'
import { shouldGenerate, generateBlogPost } from '@/lib/auto-blog'

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

    // Run the full pipeline in one shot (~30-50s typically)
    const post = await generateBlogPost()

    return NextResponse.json({
      success: true,
      post: { title: post.title, slug: post.slug, status: 'created' },
    })
  } catch (error) {
    console.error('[auto-blog] Cron error:', error)
    return NextResponse.json(
      { error: 'Auto-blog generation failed', details: String(error) },
      { status: 500 }
    )
  }
}
