import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generatePillarArticle } from '@/lib/gemini'
import { getPhotoUrl } from '@/lib/unsplash'
import { uploadFromUrl } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { topic, categoryId } = await request.json()

    if (!topic || !categoryId) {
      return NextResponse.json(
        { error: 'Topic and categoryId are required' },
        { status: 400 }
      )
    }

    // Get spoke articles in this category
    const { data: postCategories } = await supabase
      .from('post_categories')
      .select('post_id')
      .eq('category_id', categoryId)

    if (!postCategories || postCategories.length === 0) {
      return NextResponse.json(
        { error: 'No articles found in this category' },
        { status: 400 }
      )
    }

    const postIds = postCategories.map((pc) => pc.post_id)
    const { data: articles } = await supabase
      .from('posts')
      .select('title, slug, excerpt')
      .in('id', postIds)
      .eq('status', 'published')
      .limit(10)

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: 'No published articles in this category' },
        { status: 400 }
      )
    }

    // Get pillar prompt
    const { data: pillarPrompt } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('prompt_type', 'pillar')
      .limit(1)
      .single()

    if (!pillarPrompt) {
      return NextResponse.json({ error: 'No pillar prompt found' }, { status: 400 })
    }

    // Generate pillar article
    const content = await generatePillarArticle(
      topic,
      articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt || '',
      })),
      pillarPrompt.prompt_text
    )

    // Generate slug
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)

    // Get image
    let featuredImage: string | null = null
    const photoUrl = await getPhotoUrl(topic)
    if (photoUrl) {
      try {
        featuredImage = await uploadFromUrl(photoUrl)
      } catch {
        featuredImage = photoUrl
      }
    }

    const { data: author } = await supabase
      .from('authors')
      .select('id')
      .limit(1)
      .single()

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: topic,
        slug,
        content,
        featured_image: featuredImage,
        author_id: author?.id || null,
        status: 'draft',
        is_pillar: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (post) {
      await supabase
        .from('post_categories')
        .insert({ post_id: post.id, category_id: categoryId })
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Pillar generation error:', error)
    return NextResponse.json(
      { error: 'Pillar generation failed', details: String(error) },
      { status: 500 }
    )
  }
}
