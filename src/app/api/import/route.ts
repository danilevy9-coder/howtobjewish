import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseString } from 'xml2js'

interface WPCategory {
  'wp:term_id': string[]
  'wp:category_nicename': string[]
  'wp:category_parent': string[]
  'wp:cat_name': string[]
}

interface WPTag {
  'wp:term_id': string[]
  'wp:tag_slug': string[]
  'wp:tag_name': string[]
}

interface WPItem {
  title: string[]
  'wp:post_name': string[]
  'content:encoded': string[]
  'excerpt:encoded': string[]
  'wp:post_date': string[]
  'wp:post_type': string[]
  'wp:status': string[]
  'wp:post_id': string[]
  category?: Array<{ _: string; $: { domain: string; nicename: string } }>
}

function parseXml(xml: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: true }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Verify auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const xmlContent = await file.text()
    const parsed = await parseXml(xmlContent) as Record<string, unknown>

    const channel = (parsed as { rss: { channel: unknown[] } }).rss.channel[0] as Record<string, unknown>
    const wpCategories = (channel['wp:category'] || []) as WPCategory[]
    const wpTags = (channel['wp:tag'] || []) as WPTag[]
    const items = (channel.item || []) as WPItem[]

    const stats = { categories: 0, tags: 0, posts: 0, pages: 0, skipped: 0 }

    // 1. Import categories
    const categoryMap = new Map<string, string>() // slug -> uuid

    // First pass: insert root categories
    for (const cat of wpCategories) {
      const slug = cat['wp:category_nicename'][0]
      const name = cat['wp:cat_name'][0]
      const parentSlug = cat['wp:category_parent']?.[0] || ''

      if (parentSlug) continue // skip children first pass

      const { data, error } = await supabase
        .from('categories')
        .upsert({ name, slug, parent_id: null }, { onConflict: 'slug' })
        .select('id')
        .single()

      if (data) {
        categoryMap.set(slug, data.id)
        stats.categories++
      }
      if (error) console.error('Category error:', slug, error.message)
    }

    // Second pass: insert child categories
    for (const cat of wpCategories) {
      const slug = cat['wp:category_nicename'][0]
      const name = cat['wp:cat_name'][0]
      const parentSlug = cat['wp:category_parent']?.[0] || ''

      if (!parentSlug) continue

      const parentId = categoryMap.get(parentSlug) || null

      const { data, error } = await supabase
        .from('categories')
        .upsert({ name, slug, parent_id: parentId }, { onConflict: 'slug' })
        .select('id')
        .single()

      if (data) {
        categoryMap.set(slug, data.id)
        stats.categories++
      }
      if (error) console.error('Category error:', slug, error.message)
    }

    // 2. Import tags
    const tagMap = new Map<string, string>() // slug -> uuid

    for (const tag of wpTags) {
      const slug = tag['wp:tag_slug'][0]
      const name = tag['wp:tag_name'][0]

      const { data, error } = await supabase
        .from('tags')
        .upsert({ name, slug }, { onConflict: 'slug' })
        .select('id')
        .single()

      if (data) {
        tagMap.set(slug, data.id)
        stats.tags++
      }
      if (error) console.error('Tag error:', slug, error.message)
    }

    // 3. Ensure default author exists
    const { data: author } = await supabase
      .from('authors')
      .upsert({ name: 'Rabbi D Levy', email: 'danilevy9@gmail.com' }, { onConflict: 'email' })
      .select('id')
      .single()

    const authorId = author?.id || null

    // 4. Import posts and pages
    for (const item of items) {
      const postType = item['wp:post_type']?.[0]
      if (postType !== 'post' && postType !== 'page') {
        stats.skipped++
        continue
      }

      const wpStatus = item['wp:status']?.[0]
      if (wpStatus === 'trash' || wpStatus === 'auto-draft') {
        stats.skipped++
        continue
      }

      const title = item.title[0] || ''
      let slug = item['wp:post_name']?.[0] || ''
      const content = item['content:encoded']?.[0] || ''
      const excerpt = item['excerpt:encoded']?.[0] || ''
      const pubDate = item['wp:post_date']?.[0] || null
      const wpId = parseInt(item['wp:post_id']?.[0] || '0', 10)

      // Auto-generate slug from title for drafts that have no slug
      if (!slug && title) {
        slug = title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 80)
      }

      if (!slug) {
        stats.skipped++
        continue
      }

      const status = wpStatus === 'publish' ? 'published' : 'draft'

      const { data: post, error } = await supabase
        .from('posts')
        .upsert(
          {
            title,
            slug,
            content,
            excerpt: excerpt || null,
            author_id: authorId,
            status,
            published_at: status === 'published' && pubDate ? pubDate : null,
            wp_original_id: wpId,
          },
          { onConflict: 'slug' }
        )
        .select('id')
        .single()

      if (error) {
        console.error('Post error:', slug, error.message)
        stats.skipped++
        continue
      }

      if (!post) continue

      if (postType === 'post') stats.posts++
      else stats.pages++

      // Link categories and tags
      const itemCategories = item.category || []
      for (const cat of itemCategories) {
        const domain = cat.$?.domain
        const nicename = cat.$?.nicename

        if (domain === 'category' && nicename) {
          const catId = categoryMap.get(nicename)
          if (catId) {
            await supabase
              .from('post_categories')
              .upsert({ post_id: post.id, category_id: catId })
          }
        } else if (domain === 'post_tag' && nicename) {
          const tagId = tagMap.get(nicename)
          if (tagId) {
            await supabase
              .from('post_tags')
              .upsert({ post_id: post.id, tag_id: tagId })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Imported ${stats.categories} categories, ${stats.tags} tags, ${stats.posts} posts, ${stats.pages} pages. Skipped ${stats.skipped} items.`,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: String(error) },
      { status: 500 }
    )
  }
}
