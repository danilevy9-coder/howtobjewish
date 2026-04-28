'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Sparkles,
  Clock,
  Upload,
  Wand2,
  ShoppingBag,
  LogOut,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/generate', label: 'AI Generate', icon: Wand2 },
  { href: '/admin/prompts', label: 'AI Prompts', icon: Sparkles },
  { href: '/admin/queue', label: 'Publish Queue', icon: Clock },
  { href: '/admin/import', label: 'WP Import', icon: Upload },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin" className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          HTB Admin
        </Link>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors mt-1"
        >
          View Site &rarr;
        </Link>
      </div>
    </aside>
  )
}
