'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { Save, Trash2, Eye, ArrowLeft, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import ImagePicker from '@/components/admin/ImagePicker'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="border rounded-lg p-8 text-center text-gray-400">Loading editor...</div>,
})

interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [status, setStatus] = useState('draft')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPost()
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPost() {
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (!post) {
      router.push('/admin/posts')
      return
    }

    setTitle(post.title)
    setSlug(post.slug)
    setContent(post.content)
    setExcerpt(post.excerpt || '')
    setFeaturedImage(post.featured_image || '')
    setStatus(post.status)
    setMetaTitle(post.meta_title || '')
    setMetaDescription(post.meta_description || '')

    const { data: postCats } = await supabase
      .from('post_categories')
      .select('category_id')
      .eq('post_id', id)

    setSelectedCategories(postCats?.map((pc) => pc.category_id) || [])
    setLoading(false)
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function handleSave() {
    setSaving(true)

    const { error } = await supabase
      .from('posts')
      .update({
        title,
        slug,
        content,
        excerpt: excerpt || null,
        featured_image: featuredImage || null,
        status,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        published_at: status === 'published' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)

    if (!error) {
      // Update categories
      await supabase.from('post_categories').delete().eq('post_id', id)
      if (selectedCategories.length > 0) {
        await supabase.from('post_categories').insert(
          selectedCategories.map((catId) => ({ post_id: id, category_id: catId }))
        )
      }
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    router.push('/admin/posts')
  }

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading post...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/posts" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Edit Post</h1>
        </div>
        <div className="flex gap-2">
          <a
            href={`/${slug}/`}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            Preview
          </a>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
              <span className="text-gray-400 text-sm">/</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="draft">Draft</option>
              <option value="queued">Queued</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
            {featuredImage ? (
              <div>
                <img src={featuredImage} alt="Featured" className="w-full rounded-md mb-2" />
                <button
                  onClick={() => setFeaturedImage('')}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <ImagePicker
                value={featuredImage}
                onChange={setFeaturedImage}
                inline
              />
            )}
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded"
                  />
                  <span className={cat.parent_id ? 'ml-4' : ''}>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">SEO</label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Custom SEO title"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Custom SEO description"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
