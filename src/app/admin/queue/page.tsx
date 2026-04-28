'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Play, ArrowUp, ArrowDown, Eye } from 'lucide-react'
import Link from 'next/link'

interface QueuedPost {
  id: string
  title: string
  slug: string
  status: string
  scheduled_at: string | null
  created_at: string
}

export default function QueuePage() {
  const [posts, setPosts] = useState<QueuedPost[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadQueue()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadQueue() {
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, status, scheduled_at, created_at')
      .eq('status', 'queued')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    setPosts(data || [])
    setLoading(false)
  }

  async function publishNow(postId: string) {
    await supabase
      .from('posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', postId)

    await loadQueue()
  }

  async function moveToDraft(postId: string) {
    await supabase
      .from('posts')
      .update({ status: 'draft' })
      .eq('id', postId)

    await loadQueue()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Publish Queue
        </h1>
        <span className="text-sm text-gray-500">{posts.length} post(s) queued</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading queue...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No posts in the queue.</p>
            <p className="text-sm mt-1">
              Set posts to &quot;Queued&quot; status to add them here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post, index) => (
              <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                <span className="text-gray-400 text-sm font-mono w-6">{index + 1}</span>

                <div className="flex-1">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="font-medium text-sm text-blue-600 hover:text-blue-800"
                  >
                    {post.title}
                  </Link>
                  {post.scheduled_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Scheduled: {new Date(post.scheduled_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => publishNow(post.id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                    title="Publish now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <a
                    href={`/${post.slug}/`}
                    target="_blank"
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => moveToDraft(post.id)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                    title="Move to draft"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
