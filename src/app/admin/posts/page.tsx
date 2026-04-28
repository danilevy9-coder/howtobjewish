'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ImageIcon, X } from 'lucide-react'
import ImagePicker from '@/components/admin/ImagePicker'

interface Post {
  id: string
  title: string
  slug: string
  status: string
  featured_image: string | null
  published_at: string | null
  created_at: string
  is_pillar: boolean
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [imagePickerPostId, setImagePickerPostId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPosts()
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPosts() {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select('id, title, slug, status, featured_image, published_at, created_at, is_pillar')
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  async function setPostImage(postId: string, imageUrl: string) {
    await supabase
      .from('posts')
      .update({ featured_image: imageUrl || null })
      .eq('id', postId)

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, featured_image: imageUrl || null } : p))
    )
    setImagePickerPostId(null)
  }

  const filteredPosts = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/admin/generate"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Generate New
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="queued">Queued</option>
        </select>
      </div>

      {/* Image Picker Modal */}
      {imagePickerPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg mx-4">
            <ImagePicker
              value={posts.find((p) => p.id === imagePickerPostId)?.featured_image || ''}
              onChange={(url) => setPostImage(imagePickerPostId, url)}
              onClose={() => setImagePickerPostId(null)}
            />
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">Image</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No posts found.
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setImagePickerPostId(post.id)}
                      className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all flex-shrink-0"
                      title={post.featured_image ? 'Change image' : 'Add image'}
                    >
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {post.title}
                    </Link>
                    {post.is_pillar && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        Pillar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">
                    /{post.slug}/
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : post.status === 'queued'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
