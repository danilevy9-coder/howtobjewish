import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { writeArticleContent } from '@/lib/auto-blog'
import { verifyPipelineAuth, callNextStep, type PipelineState } from '@/lib/auto-blog-pipeline'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!verifyPipelineAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state: PipelineState = await request.json()
    console.log(`[auto-blog:${state.runId}] Step 3: Writing article for "${state.plan!.topic}"`)

    const article = await writeArticleContent(state.plan!, state.existingPosts)

    console.log(`[auto-blog:${state.runId}] Article written: "${article.title}"`)

    const nextState: PipelineState = { ...state, article }

    after(() => callNextStep('/api/auto-blog/pipeline/generate-meta', nextState))

    return NextResponse.json({
      step: 'write-article',
      runId: state.runId,
      title: article.title,
    })
  } catch (error) {
    console.error('[auto-blog] write-article failed:', error)
    return NextResponse.json(
      { error: 'write-article failed', details: String(error) },
      { status: 500 }
    )
  }
}
