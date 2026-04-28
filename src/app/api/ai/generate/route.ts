import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateArticle, addInternalLinks } from '@/lib/gemini'
import { getPhotoUrl } from '@/lib/unsplash'
import { uploadFromUrl } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { topic, promptId, categoryId, autoInterlink } = await request.json()

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Get the AI prompt
    let systemPrompt: string
    if (promptId) {
      const { data: prompt } = await supabase
        .from('ai_prompts')
        .select('prompt_text')
        .eq('id', promptId)
        .single()
      systemPrompt = prompt?.prompt_text || ''
    } else {
      const { data: prompt } = await supabase
        .from('ai_prompts')
        .select('prompt_text')
        .eq('prompt_type', 'article')
        .limit(1)
        .single()
      systemPrompt = prompt?.prompt_text || ''
    }

    if (!systemPrompt) {
      return NextResponse.json({ error: 'No AI prompt found' }, { status: 400 })
    }

    // 1. Generate article content via Gemini
    const article = await generateArticle(topic, systemPrompt)

    // 2. Auto-interlink if requested
    let finalContent = article.content
    if (autoInterlink) {
      const { data: existingPosts } = await supabase
        .from('posts')
        .select('title, slug')
        .eq('status', 'published')
        .limit(200)

      if (existingPosts && existingPosts.length > 0) {
        const { data: interlinkPrompt } = await supabase
          .from('ai_prompts')
          .select('prompt_text')
          .eq('prompt_type', 'interlinking')
          .limit(1)
          .single()

        if (interlinkPrompt) {
          finalContent = await addInternalLinks(
            article.content,
            existingPosts,
            interlinkPrompt.prompt_text
          )
        }
      }
    }

    // 3. Fetch image from Unsplash
    let featuredImage: string | null = null
    const photoUrl = await getPhotoUrl(topic)
    if (photoUrl) {
      try {
        featuredImage = await uploadFromUrl(photoUrl)
      } catch (e) {
        console.error('Cloudinary upload failed:', e)
        featuredImage = photoUrl // fallback to Unsplash URL
      }
    }

    // 4. Get default author
    const { data: author } = await supabase
      .from('authors')
      .select('id')
      .limit(1)
      .single()

    // 5. Save to database as draft
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: article.title,
        slug: article.slug,
        content: finalContent,
        excerpt: article.excerpt,
        featured_image: featuredImage,
        author_id: author?.id || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 6. Link to category if provided
    if (categoryId && post) {
      await supabase
        .from('post_categories')
        .insert({ post_id: post.id, category_id: categoryId })
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Generation failed', details: String(error) },
      { status: 500 }
    )
  }
}
