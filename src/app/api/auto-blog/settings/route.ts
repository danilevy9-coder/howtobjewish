import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('auto_blog_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const body = await request.json()

    const { data: existing } = await supabase
      .from('auto_blog_settings')
      .select('id')
      .limit(1)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('auto_blog_settings')
      .update({
        is_active: body.is_active,
        min_hours_between: body.min_hours_between,
        max_hours_between: body.max_hours_between,
        auto_publish: body.auto_publish,
      })
      .eq('id', existing.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
