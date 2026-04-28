import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { pickTopic } from '@/lib/auto-blog'
import { verifyPipelineAuth, callNextStep, type PipelineState } from '@/lib/auto-blog-pipeline'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!verifyPipelineAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state: PipelineState = await request.json()
    console.log(`[auto-blog:${state.runId}] Step 2: Picking topic (${state.effectiveType})`)

    const plan = await pickTopic(
      state.effectiveType,
      state.existingPosts,
      state.holiday,
      state.categories
    )

    console.log(`[auto-blog:${state.runId}] Topic: "${plan.topic}"`)

    const nextState: PipelineState = { ...state, plan }

    after(() => callNextStep('/api/auto-blog/pipeline/write-article', nextState))

    return NextResponse.json({
      step: 'pick-topic',
      runId: state.runId,
      topic: plan.topic,
    })
  } catch (error) {
    console.error('[auto-blog] pick-topic failed:', error)
    return NextResponse.json(
      { error: 'pick-topic failed', details: String(error) },
      { status: 500 }
    )
  }
}
