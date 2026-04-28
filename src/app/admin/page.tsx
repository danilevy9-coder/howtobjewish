import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Clock, Eye, FolderTree } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalPosts },
    { count: publishedPosts },
    { count: draftPosts },
    { count: queuedPosts },
    { count: totalCategories },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, title, slug, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Total Posts', value: totalPosts || 0, icon: FileText, color: 'bg-blue-500' },
    { label: 'Published', value: publishedPosts || 0, icon: Eye, color: 'bg-green-500' },
    { label: 'In Queue', value: queuedPosts || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Drafts', value: draftPosts || 0, icon: FileText, color: 'bg-gray-500' },
    { label: 'Categories', value: totalCategories || 0, icon: FolderTree, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${stat.color} p-2 rounded-md`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/generate"
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <h3 className="font-semibold mb-1">Generate Article</h3>
          <p className="text-sm text-blue-200">Use AI to create a new article</p>
        </Link>
        <Link
          href="/admin/posts"
          className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold mb-1">Manage Posts</h3>
          <p className="text-sm text-gray-500">Edit, review, and publish articles</p>
        </Link>
        <Link
          href="/admin/import"
          className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold mb-1">Import WordPress</h3>
          <p className="text-sm text-gray-500">Import content from WordPress XML</p>
        </Link>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Recent Posts</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentPosts && recentPosts.length > 0 ? (
            recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/posts/${post.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium">{post.title}</span>
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
              </Link>
            ))
          ) : (
            <p className="p-4 text-sm text-gray-400">No posts yet. Import or generate content to get started.</p>
          )}
        </div>
      </div>
    </div>
  )
}
