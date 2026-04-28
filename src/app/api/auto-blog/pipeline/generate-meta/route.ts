import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { generateMetaDescription, fetchImage } from '@/lib/auto-blog'
import { verifyPipelineAuth, callNextStep, type PipelineState } from '@/lib/auto-blog-pipeline'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!verifyPipelineAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state: PipelineState = await request.json()
    console.log(`[auto-blog:${state.runId}] Step 4: Meta description + image`)

    // Run meta description and image fetch in parallel
    const [metaDescription, featuredImage] = await Promise.all([
      generateMetaDescription(state.plan!),
      fetchImage(state.plan!.imageSearchQuery),
    ])

    console.log(`[auto-blog:${state.runId}] Meta + image done`)

    const nextState: PipelineState = { ...state, metaDescription, featuredImage }

    after(() => callNextStep('/api/auto-blog/pipeline/save', nextState))

    return NextResponse.json({
      step: 'generate-meta',
      runId: state.runId,
      hasImage: !!featuredImage,
    })
  } catch (error) {
    console.error('[auto-blog] generate-meta failed:', error)
    return NextResponse.json(
      { error: 'generate-meta failed', details: String(error) },
      { status: 500 }
    )
  }
}
