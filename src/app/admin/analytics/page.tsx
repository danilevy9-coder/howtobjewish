import { createServiceClient } from '@/lib/supabase/server'
import { BarChart3, Users, Eye, TrendingUp, Globe, FileText } from 'lucide-react'

interface TopPage { path: string; view_count: number }
interface TopReferrer { referrer: string; ref_count: number }
interface TopCountry { country: string; country_count: number }
interface RecentView { path: string; created_at: string; referrer: string | null; country: string | null }

export default async function AnalyticsPage() {
  const supabase = await createServiceClient()

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalViews },
    { count: todayViews },
    { count: weekViews },
    { count: monthViews },
    topPagesResult,
    recentViewsResult,
    topReferrersResult,
    topCountriesResult,
    { count: uniqueVisitors },
  ] = await Promise.all([
    supabase.from('page_views').select('*', { count: 'exact', head: true }),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.rpc('get_top_pages', { days_ago: 30 }),
    supabase
      .from('page_views')
      .select('path, created_at, referrer, country')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.rpc('get_top_referrers', { days_ago: 30 }),
    supabase.rpc('get_top_countries', { days_ago: 30 }),
    supabase
      .from('page_views')
      .select('visitor_id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)
      .not('visitor_id', 'is', null),
  ])

  const topPages = (topPagesResult.data || []) as TopPage[]
  const recentViews = (recentViewsResult.data || []) as RecentView[]
  const topReferrers = (topReferrersResult.data || []) as TopReferrer[]
  const topCountries = (topCountriesResult.data || []) as TopCountry[]

  const stats = [
    { label: 'Total Views', value: totalViews || 0, icon: Eye, color: 'bg-blue-500' },
    { label: 'Today', value: todayViews || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Last 7 Days', value: weekViews || 0, icon: BarChart3, color: 'bg-purple-500' },
    { label: 'Last 30 Days', value: monthViews || 0, icon: BarChart3, color: 'bg-indigo-500' },
    { label: 'Unique Visitors (30d)', value: uniqueVisitors || 0, icon: Users, color: 'bg-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

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
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Pages */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold">Top Pages (30 days)</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topPages.length > 0 ? (
              topPages.map((page, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium truncate max-w-[70%]">{page.path}</span>
                  <span className="text-sm text-gray-500">{page.view_count.toLocaleString()} views</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-gray-400">No page data yet</p>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold">Top Referrers (30 days)</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topReferrers.length > 0 ? (
              topReferrers.map((ref, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium truncate max-w-[70%]">
                    {ref.referrer || '(direct)'}
                  </span>
                  <span className="text-sm text-gray-500">{ref.ref_count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-gray-400">No referrer data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Countries */}
      {topCountries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold">Top Countries (30 days)</h2>
          </div>
          <div className="flex flex-wrap gap-3 p-4">
            {topCountries.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-md px-3 py-2 text-sm">
                <span className="font-medium">{c.country || 'Unknown'}</span>
                <span className="text-gray-500 ml-2">{c.country_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Views */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Recent Page Views</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentViews.length > 0 ? (
                recentViews.map((view, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{view.path}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {view.referrer || '(direct)'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{view.country || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(view.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No page views recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
